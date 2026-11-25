const RAJAPINTA = "https://vectorsigma.org/briefer/api/v1/";
const ASIAKASNUMERO = 10;

function rajapinnanOsoite(reitti) {
    const osoite = new URL(reitti, RAJAPINTA);
    osoite.searchParams.set("customer", ASIAKASNUMERO);
    osoite.searchParams.set("lang", "fi");
    return osoite;
}

async function haeJson(osoite, naytaTilanne, signaali) {
    const enintaanYrityksia = 3;

    for (let yritys = 1; ; yritys++) {
        // Aikaraja koskee yhtä pyyntöä. Uusi haku voi myös perua sen.
        const aikaraja = AbortSignal.timeout(15000);
        const pyyntosignaali = signaali
            ? AbortSignal.any([signaali, aikaraja])
            : aikaraja;
        pyyntosignaali.throwIfAborted();

        const vastaus = await fetch(osoite, { signal: pyyntosignaali });
        pyyntosignaali.throwIfAborted();

        if (vastaus.ok) {
            return vastaus.json();
        }

        if (vastaus.status !== 429 || yritys === enintaanYrityksia) {
            throw new Error(`HTTP ${vastaus.status}`);
        }

        const retryAfter = vastaus.headers.get("Retry-After");
        const odotus = retryAfter && /^\d+$/.test(retryAfter)
            ? Number(retryAfter)
            : 3;

        naytaTilanne(
            `Ladataan… Palvelin on ruuhkautunut. Yritetään uudelleen ${odotus} s kuluttua.`
        );
        await new Promise(resolve => setTimeout(resolve, odotus * 1000));
    }
}

function rajapinnanTeksti(arvo) {
    return typeof arvo === "string" ? arvo.trim() : "";
}

function alustaKirjavalikoima() {
    const hakulomake = document.getElementById("kirjahaku");

    if (!hakulomake) {
        return;
    }

    const hakukentta = document.getElementById("hakusana");
    const kirjalista = document.getElementById("kirjalista");
    const hakutilanne = document.getElementById("hakutilanne");
    const eiTuloksia = document.getElementById("ei-tuloksia");
    const lisaaPainike = document.getElementById("nayta-lisaa");
    const uudelleenPainike = document.getElementById("lataa-kirjat-uudelleen");
    const ohjevalikko = document.getElementById("kirjavalikoiman-ohjeet");
    const hakuunLinkki = ohjevalikko.querySelector('a[href="#hakusana"]');

    const hintamuoto = new Intl.NumberFormat("fi-FI", {
        style: "currency",
        currency: "EUR"
    });

    // Rajapinnan kuntoluokitus asteikolla 1–5.
    const kuntoluokat = new Map([
        [1, "Huono"],
        [2, "Kulunut"],
        [3, "Kohtalainen"],
        [4, "Hyvä"],
        [5, "Kuin uusi"]
    ]);

    let hakusana = "";
    let seuraavaSivu = null;
    let naytetty = 0;
    let aktiivinenPyynto = null;

    function lisaaKirjakortit(kirjat) {
        const kortit = document.createDocumentFragment();
        let ensimmainenOtsikko = null;

        for (const kirja of kirjat) {
            const kortti = document.createElement("article");

            const otsikko = document.createElement("h3");
            otsikko.textContent = rajapinnanTeksti(kirja.title) || "Nimetön kirja";
            otsikko.tabIndex = -1;

            const tekija = document.createElement("p");
            const kirjailija = rajapinnanTeksti(kirja.author) || "Ei ilmoitettu";
            tekija.textContent = `Kirjailija: ${kirjailija}`;

            const kuntotieto = document.createElement("p");
            const kunto = kuntoluokat.get(kirja.condition) ?? "Ei ilmoitettu";
            kuntotieto.textContent = `Kunto: ${kunto}`;

            const hintatieto = document.createElement("p");
            const hinta = Number.isFinite(kirja.price)
                ? hintamuoto.format(kirja.price)
                : "Kysy liikkeestä";
            hintatieto.textContent = `Hinta: ${hinta}`;

            kortti.append(otsikko, tekija, kuntotieto, hintatieto);
            kortit.append(kortti);
            ensimmainenOtsikko ??= otsikko;
        }

        kirjalista.append(kortit);
        return ensimmainenOtsikko;
    }

    async function lataaKirjoja(lataaLisaa = false) {
        aktiivinenPyynto?.abort();
        aktiivinenPyynto = new AbortController();
        const signaali = aktiivinenPyynto.signal;

        if (!lataaLisaa) {
            seuraavaSivu = null;
            naytetty = 0;
            kirjalista.replaceChildren();
            lisaaPainike.hidden = true;
        }

        if (document.activeElement === uudelleenPainike) {
            hakutilanne.focus();
        }

        uudelleenPainike.hidden = true;
        eiTuloksia.hidden = true;
        lisaaPainike.setAttribute("aria-disabled", "true");
        kirjalista.setAttribute("aria-busy", "true");

        const osoite = rajapinnanOsoite("items");
        const haku = hakusana.toLocaleLowerCase("fi-FI");

        if (haku) {
            osoite.searchParams.set("q", hakusana);
        }

        const latausviesti = lataaLisaa
            ? "Ladataan lisää kirjoja…"
            : "Ladataan kirjavalikoimaa…";
        let kursori = seuraavaSivu;
        let sivu;
        let kirjat;

        try {
            do {
                if (kursori !== null) {
                    osoite.searchParams.set("cursor", kursori);
                }

                hakutilanne.textContent = latausviesti;
                sivu = await haeJson(osoite, viesti => {
                    hakutilanne.textContent = viesti;
                }, signaali);
                signaali.throwIfAborted();

                if (!Array.isArray(sivu?.items)) {
                    throw new Error("Rajapinnan vastauksesta puuttuu kirjalista.");
                }

                // Rajapinnan haku rajaa koko valikoimaa. Suodatin säilyttää
                // hakutuloksissa kirjan nimen tai kirjailijan osumat.
                kirjat = sivu.items.filter(kirja => {
                    if (!kirja) {
                        return false;
                    }

                    return !haku || [kirja.title, kirja.author].some(arvo =>
                        rajapinnanTeksti(arvo).toLocaleLowerCase("fi-FI").includes(haku)
                    );
                });

                kursori = sivu.next ?? null;
            } while (kirjat.length === 0 && kursori !== null);

            const siirraKohdistus = lataaLisaa && (
                document.activeElement === lisaaPainike ||
                document.activeElement === document.body
            );
            const ensimmainenOtsikko = lisaaKirjakortit(kirjat);

            seuraavaSivu = kursori;
            naytetty += kirjat.length;
            lisaaPainike.hidden = seuraavaSivu === null;
            eiTuloksia.hidden = naytetty !== 0;

            if (naytetty === 0) {
                hakutilanne.textContent = haku
                    ? "Hakusanalla ei löytynyt kirjoja."
                    : "Valikoimassa ei juuri nyt ole kirjoja.";
            } else {
                const maara = !haku && Number.isInteger(sivu.total) && sivu.total >= naytetty
                    ? `${naytetty} / ${sivu.total}`
                    : naytetty;
                hakutilanne.textContent = `Näytetään ${maara} kirjaa.`;

                if (lisaaPainike.hidden) {
                    hakutilanne.textContent += " Kaikki tulokset on näytetty.";
                }
            }

            if (siirraKohdistus) {
                (ensimmainenOtsikko ?? hakutilanne).focus();
            }
        } catch {
            if (signaali.aborted) {
                return;
            }

            hakutilanne.textContent = lataaLisaa
                ? "Lisää kirjoja ei voitu ladata. Kokeile Näytä lisää -painiketta uudelleen."
                : "Kirjavalikoimaa ei voitu ladata. Yritä uudelleen.";
            uudelleenPainike.hidden = lataaLisaa;
        } finally {
            if (!signaali.aborted) {
                aktiivinenPyynto = null;
                kirjalista.removeAttribute("aria-busy");
                lisaaPainike.removeAttribute("aria-disabled");
            }
        }
    }

    hakulomake.addEventListener("submit", function (tapahtuma) {
        tapahtuma.preventDefault();
        hakusana = hakukentta.value.trim();
        lataaKirjoja();
    });

    lisaaPainike.addEventListener("click", function () {
        if (aktiivinenPyynto === null && seuraavaSivu !== null) {
            lataaKirjoja(true);
        }
    });

    uudelleenPainike.addEventListener("click", () => lataaKirjoja());

    hakuunLinkki.addEventListener("click", function () {
        ohjevalikko.hidePopover?.();
        hakukentta.focus();
    });

    lataaKirjoja();
}

function muotoileAukioloajat(tunnit) {
    if (!Array.isArray(tunnit)) {
        return rajapinnanTeksti(tunnit);
    }

    const aukioloajat = [];

    for (const jakso of tunnit) {
        const paivat = rajapinnanTeksti(jakso?.days);
        const alkaa = rajapinnanTeksti(jakso?.open);
        const paattyy = rajapinnanTeksti(jakso?.close);

        if (paivat && alkaa && paattyy) {
            aukioloajat.push(`${paivat} klo ${alkaa}–${paattyy}`);
        }
    }

    return aukioloajat.join(", ");
}

function alustaAsiakastiedot() {
    const tietolista = document.getElementById("asiakastiedot");

    if (!tietolista) {
        return;
    }

    const tilanne = document.getElementById("asiakastilanne");
    const uudelleenPainike = document.getElementById("lataa-asiakastiedot-uudelleen");

    async function lataaAsiakastiedot() {
        if (document.activeElement === uudelleenPainike) {
            tilanne.focus();
        }

        uudelleenPainike.hidden = true;
        tietolista.setAttribute("aria-busy", "true");
        tilanne.textContent = "Ladataan myymälän tietoja…";

        try {
            const asiakas = await haeJson(rajapinnanOsoite("customer"), viesti => {
                tilanne.textContent = viesti;
            });

            const tiedot = [
                ["Yritys", rajapinnanTeksti(asiakas?.company)],
                ["Yhteyshenkilö", rajapinnanTeksti(asiakas?.contact)],
                ["Osoite", rajapinnanTeksti(asiakas?.address)],
                ["Aukioloajat", muotoileAukioloajat(asiakas?.hours)]
            ].filter(([, arvo]) => arvo);

            tietolista.replaceChildren();

            for (const [nimi, arvo] of tiedot) {
                const otsikko = document.createElement("dt");
                otsikko.textContent = nimi;
                const kuvaus = document.createElement("dd");
                kuvaus.textContent = arvo;
                tietolista.append(otsikko, kuvaus);
            }

            tietolista.hidden = tiedot.length === 0;
            tilanne.textContent = tietolista.hidden
                ? "Myymälän tietoja ei ole saatavilla."
                : "Myymälän tiedot ladattu.";
        } catch {
            tilanne.textContent = "Myymälän tietoja ei voitu ladata. Yritä uudelleen.";
            uudelleenPainike.hidden = false;
        } finally {
            tietolista.removeAttribute("aria-busy");
        }
    }

    uudelleenPainike.addEventListener("click", lataaAsiakastiedot);
    lataaAsiakastiedot();
}

function alustaKirjatoive() {
    const lomake = document.getElementById("kirjatoive");

    if (!lomake) {
        return;
    }

    const sahkoposti = document.getElementById("sahkoposti");
    const kirjannimi = document.getElementById("kirjannimi");
    const kirjailija = document.getElementById("kirjailija");
    const lisatiedot = document.getElementById("lisatiedot");

    const sahkopostivirhe = document.getElementById("sahkopostivirhe");
    const kirjavirhe = document.getElementById("kirjavirhe");
    const lomaketilanne = document.getElementById("lomaketilanne");
    const yhteenveto = document.getElementById("yhteenveto");

    const luonnoksenAvain = "vanha-sivu-kirjatoive-luonnos";

    // Palauta kirjatoiveen luonnos sivun avautuessa.
    try {
        const tallennettu = localStorage.getItem(luonnoksenAvain);

        if (tallennettu !== null) {
            const luonnos = JSON.parse(tallennettu);
            kirjannimi.value = luonnos.nimi ?? "";
            kirjailija.value = luonnos.kirjailija ?? "";
        }
    } catch {
        // Lomaketta voi käyttää, vaikka luonnosta ei voitu lukea.
    }

    lomake.addEventListener("submit", function (tapahtuma) {
        // Estä lomakkeen lähetys ja sivun uudelleenlataus.
        tapahtuma.preventDefault();

        yhteenveto.hidden = true;
        lomaketilanne.textContent = "";

        sahkopostivirhe.hidden = true;
        kirjavirhe.hidden = true;

        sahkoposti.removeAttribute("aria-invalid");
        kirjannimi.removeAttribute("aria-invalid");
        kirjailija.removeAttribute("aria-invalid");

        const osoite = sahkoposti.value.trim();
        const nimi = kirjannimi.value.trim();
        const tekija = kirjailija.value.trim();
        const lisatieto = lisatiedot.value.trim();

        sahkoposti.value = osoite;

        let ensimmainenVirhe = null;

        // Tarkista sähköpostiosoite selaimen validoinnilla.
        if (!sahkoposti.validity.valid) {
            sahkopostivirhe.textContent = osoite === ""
                ? "Anna sähköpostiosoitteesi."
                : "Tarkista sähköpostiosoite, esimerkiksi nimi@example.fi.";

            sahkopostivirhe.hidden = false;
            sahkoposti.setAttribute("aria-invalid", "true");
            ensimmainenVirhe = sahkoposti;
        }

        // Vähintään kirjan nimi tai kirjailija tarvitaan.
        if (nimi === "" && tekija === "") {
            kirjavirhe.textContent =
                "Anna vähintään kirjan nimi tai kirjailija.";

            kirjavirhe.hidden = false;
            kirjannimi.setAttribute("aria-invalid", "true");
            kirjailija.setAttribute("aria-invalid", "true");

            if (ensimmainenVirhe === null) {
                ensimmainenVirhe = kirjannimi;
            }
        }

        if (ensimmainenVirhe !== null) {
            lomaketilanne.textContent =
                "Tarkista lomakkeen tiedot. Virheet on kerrottu kenttien yhteydessä.";

            ensimmainenVirhe.focus();
            return;
        }

        // Näytä syötetyt tiedot tekstinä turvallisesti.
        document.getElementById("yhteenveto-sahkoposti")
            .textContent = osoite;

        document.getElementById("yhteenveto-nimi")
            .textContent = nimi || "Ei annettu";

        document.getElementById("yhteenveto-kirjailija")
            .textContent = tekija || "Ei annettu";

        document.getElementById("yhteenveto-lisatiedot")
            .textContent = lisatieto || "Ei lisätietoja";

        yhteenveto.hidden = false;
        document.getElementById("yhteenveto-otsikko").focus();
        lomaketilanne.textContent = "Kirjatoiveesi on valmis.";

        try {
            localStorage.removeItem(luonnoksenAvain);
        } catch {
            // Lomakkeen tarkistus on jo valmis.
        }
    });

    // Piilota vanha yhteenveto ja tallenna luonnos, jos tietoja muutetaan.
    lomake.addEventListener("input", function () {
        yhteenveto.hidden = true;
        lomaketilanne.textContent = "";

        const luonnos = {
            nimi: kirjannimi.value,
            kirjailija: kirjailija.value
        };

        try {
            localStorage.setItem(luonnoksenAvain, JSON.stringify(luonnos));
        } catch {
            // Lomake toimii myös silloin, kun selain estää tallennuksen.
        }
    });

    // Ota painike käyttöön, kun lomakkeen käsittely on valmis.
    document.getElementById("tarkista").disabled = false;
}

alustaKirjavalikoima();
alustaAsiakastiedot();
alustaKirjatoive();
