function alustaKirjavalikoima() {
    const hakulomake = document.getElementById("kirjahaku");

    if (!hakulomake) {
        return;
    }

    // Esimerkkikirjat: nimi, kirjailija, kunto ja hinta euroina.
    const kirjat = [
        ["Seitsemän veljestä", "Aleksis Kivi", "Hyvä, kannessa kulumaa", 8],
        ["Kalevala", "Elias Lönnrot", "Tyydyttävä, sivut kellastuneet", 12],
        ["Tuntematon sotilas", "Väinö Linna", "Hyvä, siistit sivut", 10],
        ["Täällä Pohjantähden alla", "Väinö Linna", "Hyvä, selässä kulumaa", 14],
        ["Sinuhe egyptiläinen", "Mika Waltari", "Hyvä, kansipaperi puuttuu", 15],
        ["Muumipeikko ja pyrstötähti", "Tove Jansson", "Hyvä, siistit sivut", 9],
        ["Taikurin hattu", "Tove Jansson", "Tyydyttävä, omistuskirjoitus", 7],
        ["Vaarallinen juhannus", "Tove Jansson", "Hyvä, vähäistä kulumaa", 8],
        ["Muumipappa ja meri", "Tove Jansson", "Hyvä, siistit sivut", 10],
        ["Kesäkirja", "Tove Jansson", "Hyvä, kannessa pieni taitos", 9],
        ["Jäniksen vuosi", "Arto Paasilinna", "Hyvä, siistit sivut", 6],
        ["Ulvova mylläri", "Arto Paasilinna", "Tyydyttävä, kannet kuluneet", 5],
        ["Puhdistus", "Sofi Oksanen", "Erittäin hyvä, vähäisiä käytön jälkiä", 9],
        ["Koirapuisto", "Sofi Oksanen", "Hyvä, siistit sivut", 8],
        ["Pieni merenneito", "H. C. Andersen", "Tyydyttävä, sivuissa tahroja", 4],
        ["Ylpeys ja ennakkoluulo", "Jane Austen", "Hyvä, selässä lukutaitoksia", 7],
        ["Emma", "Jane Austen", "Hyvä, siistit sivut", 8],
        ["Hobitti", "J. R. R. Tolkien", "Hyvä, kannessa kulumaa", 12],
        ["Sormuksen ritarit", "J. R. R. Tolkien", "Hyvä, omistuskirjoitus", 11],
        ["Kaksi tornia", "J. R. R. Tolkien", "Hyvä, siistit sivut", 11],
        ["Kuninkaan paluu", "J. R. R. Tolkien", "Tyydyttävä, selkä kulunut", 9],
        ["Eikä yksikään pelastunut", "Agatha Christie", "Hyvä, sivut kellastuneet", 6],
        ["Idän pikajunan arvoitus", "Agatha Christie", "Hyvä, siistit sivut", 7],
        ["Baskervillen koira", "Arthur Conan Doyle", "Hyvä, kannessa kulumaa", 6],
        ["Aarresaari", "Robert Louis Stevenson", "Tyydyttävä, omistuskirjoitus", 5]
    ];

    const erakoko = 20;
    let hakutulokset = kirjat;
    let naytetty = 0;

    const hakukentta = document.getElementById("hakusana");
    const kirjalista = document.getElementById("kirjalista");
    const hakutilanne = document.getElementById("hakutilanne");
    const eiTuloksia = document.getElementById("ei-tuloksia");
    const lisaaPainike = document.getElementById("nayta-lisaa");
    const ohjevalikko = document.getElementById("kirjavalikoiman-ohjeet");
    const hakuunLinkki = ohjevalikko.querySelector('a[href="#hakusana"]');

    const hintamuoto = new Intl.NumberFormat("fi-FI", {
        style: "currency",
        currency: "EUR"
    });

    // Lisää näkyviin seuraavat enintään 20 hakutulosta.
    function naytaLisaa() {
        const seuraavat = hakutulokset.slice(
            naytetty,
            naytetty + erakoko
        );
        const ensimmainenUusi = kirjalista.children.length;

        for (const [nimi, kirjailija, kunto, hinta] of seuraavat) {
            const kortti = document.createElement("article");

            const otsikko = document.createElement("h3");
            otsikko.textContent = nimi;
            otsikko.tabIndex = -1;

            const tekija = document.createElement("p");
            tekija.textContent = `Kirjailija: ${kirjailija}`;

            const kuntotieto = document.createElement("p");
            kuntotieto.textContent = `Kunto: ${kunto}`;

            const hintatieto = document.createElement("p");
            hintatieto.textContent =
                `Hinta: ${hintamuoto.format(hinta)}`;

            kortti.append(otsikko, tekija, kuntotieto, hintatieto);
            kirjalista.append(kortti);
        }

        naytetty += seuraavat.length;

        eiTuloksia.hidden = hakutulokset.length !== 0;
        lisaaPainike.hidden = naytetty >= hakutulokset.length;

        if (hakutulokset.length === 0) {
            hakutilanne.textContent = "Hakutuloksia: 0.";
        } else {
            hakutilanne.textContent =
                `Näytetään ${naytetty} / ${hakutulokset.length} kirjaa.` +
                (lisaaPainike.hidden
                    ? " Kaikki tulokset on näytetty."
                    : "");
        }

        return kirjalista.children[ensimmainenUusi]
            ?.querySelector("h3");
    }

    // Haku tehdään lomakkeen lähetyksellä tai Enter-näppäimellä.
    hakulomake.addEventListener("submit", function (tapahtuma) {
        tapahtuma.preventDefault();

        const hakusana = hakukentta.value
            .trim()
            .toLocaleLowerCase("fi-FI");

        hakutulokset = kirjat.filter(function (kirja) {
            const nimi = kirja[0].toLocaleLowerCase("fi-FI");
            const kirjailija = kirja[1].toLocaleLowerCase("fi-FI");

            return nimi.includes(hakusana) ||
                kirjailija.includes(hakusana);
        });

        naytetty = 0;
        kirjalista.replaceChildren();
        naytaLisaa();
    });

    // Siirrä kohdistus ensimmäiseen lisättyyn kirjaan.
    lisaaPainike.addEventListener("click", function () {
        const ensimmainenUusiOtsikko = naytaLisaa();

        if (ensimmainenUusiOtsikko) {
            ensimmainenUusiOtsikko.focus();
        }
    });

    // Sulje ohjevalikko ennen siirtymistä hakukenttään.
    hakuunLinkki.addEventListener("click", function () {
        ohjevalikko.hidePopover?.();
    });

    // Näytä ensimmäinen erä sivun avautuessa.
    naytaLisaa();
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
alustaKirjatoive();
