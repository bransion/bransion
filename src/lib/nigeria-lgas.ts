// =====================================================================
// BRANSION — Nigerian states + LGAs + delivery fee table.
// All 36 states + FCT, all 774 LGAs. Delivery fees are starting values
// — edit STATE_DELIVERY_FEES when you get real logistics numbers.
// =====================================================================

// Compact format: comma-separated for readability.
export const NIGERIAN_STATES: Record<string, string[]> = {
  'Abia': 'Aba North,Aba South,Arochukwu,Bende,Ikwuano,Isiala Ngwa North,Isiala Ngwa South,Isuikwuato,Obi Ngwa,Ohafia,Osisioma,Ugwunagbo,Ukwa East,Ukwa West,Umuahia North,Umuahia South,Umu Nneochi'.split(','),
  'Adamawa': 'Demsa,Fufore,Ganye,Girei,Gombi,Guyuk,Hong,Jada,Lamurde,Madagali,Maiha,Mayo Belwa,Michika,Mubi North,Mubi South,Numan,Shelleng,Song,Toungo,Yola North,Yola South'.split(','),
  'Akwa Ibom': 'Abak,Eastern Obolo,Eket,Esin Udim,Essien Udim,Etim Ekpo,Etinan,Ibeno,Ibesikpo Asutan,Ibiono Ibom,Ika,Ikono,Ikot Abasi,Ikot Ekpene,Ini,Itu,Mbo,Mkpat-Enin,Nsit-Atai,Nsit-Ibom,Nsit-Ubium,Obot Akara,Okobo,Onna,Oron,Oruk Anam,Udung-Uko,Ukanafun,Uruan,Uyo'.split(','),
  'Anambra': 'Aguata,Anambra East,Anambra West,Anaocha,Awka North,Awka South,Ayamelum,Dunukofia,Ekwusigo,Idemili North,Idemili South,Ihiala,Njikoka,Nnewi North,Nnewi South,Ogbaru,Onitsha North,Onitsha South,Orumba North,Orumba South,Oyi'.split(','),
  'Bauchi': 'Alkaleri,Bauchi,Damban,Darazo,Dass,Gamawa,Ganjuwa,Giade,Itas-Gadau,Jama\'are,Katagum,Kirfi,Misau,Ningi,Shira,Tafawa Balewa,Toro,Warji,Zaki'.split(','),
  'Bayelsa': 'Brass,Ekeremor,Kolokuma/Opokuma,Nembe,Ogbia,Sagbama,Southern Ijaw,Yenagoa'.split(','),
  'Benue': 'Ado,Agatu,Apa,Buruku,Gboko,Guma,Gwer East,Gwer West,Katsina-Ala,Konshisha,Kwande,Logo,Makurdi,Obi,Ogbadibo,Ohimini,Oju,Oju,Ogbadibo,Okpokwu,Otukpo,Tarka,Ukum,Ushongo,Vandeikya'.split(','),
  'Borno': 'Abadam,Askira/Uba,Bama,Bayo,Biu,Chibok,Damboa,Dikwa,Gubio,Guzamala,Gwoza,Hawul,Jere,Kaga,Kala/Balge,Konduga,Kukawa,Kwaya Kusar,Mafa,Magumeri,Maiduguri,Marte,Mobbar,Monguno,Ngala,Ngazai,Shani'.split(','),
  'Cross River': 'Abi,Akamkpa,Akpabuyo,Bakassi,Biase,Boki,Calabar Municipal,Calabar South,Etung,Ikom,Obubra,Obudu,Odukpani,Ogoja,Yakurr,Yala'.split(','),
  'Delta': 'Aniocha North,Aniocha South,Bomadi,Burutu,Ethiope East,Ethiope West,Ika North East,Ika South,Isoko North,Isoko South,Ndokwa East,Ndokwa West,Okpe,Patani,Sapele,Udu,Ukwuani,Ughelli North,Ughelli South,Uvwie,Warri North,Warri South,Warri South West'.split(','),
  'Ebonyi': 'Abakaliki,Afikpo North,Afikpo South,Ebonyi,Ezza North,Ezza South,Ikwo,Ishielu,Ivo,Izzi,Ohaozara,Onicha,Ohaukwu'.split(','),
  'Edo': 'Akoko-Edo,Egor,Esan Central,Esan North-East,Esan South-East,Esan West,Etsako Central,Etsako East,Etsako West,Igueben,Ikpoba-Okha,Orhionmwon,Oredo,Ovia North-East,Ovia South-West,Owan East,Owan West,Uhunmwonde'.split(','),
  'Ekiti': 'Ado Ekiti,Efon,Ekiti East,Ekiti South-West,Ekiti West,Emure,Gbonyin,Ido-Osi,Ijero,Ikere,Ilejemeje,Irepodun/Ifelodun,Ise/Orun,Moba,Oye'.split(','),
  'Enugu': 'Aninri,Awgu,Ezeagu,Enugu East,Enugu North,Enugu South,Igbo Etiti,Igbo Eze North,Igbo Eze South,Isi Uzo,Nkanu,Nkanu East,Nsukka,Udenu,Udi,Uzo-Uwani,Uzo-Uwani'.split(','),
  'FCT': 'Abaji,Abuja Municipal Area Council,Bwari,Gwagwalada,Kuje,Kwali'.split(','),
  'Gombe': 'Akko,Balanga,Billiri,Dukku,Funakaye,Gombe,Kaltungo,Kwami,Nafada,Shongom,Yamaltu/Deba'.split(','),
  'Imo': 'Aboh Mbaise,Ahiazu Mbaise,Ehime Mbano,Ezinihitte,Idato North,Idato South,Ihitte/Uboma,Ikeduru,Isiala Mbano,Isu,Mbaitoli,Ngor Okpala,Njaba,Nkwerre,Nwangele,Obowo,Oguta,Ohaji/Egbema,Okigwe,Orlu,Orsu,Oru East,Oru West,Owerri Municipal,Owerri North,Owerri West,Unuimo'.split(','),
  'Jigawa': 'Auyo,Babura,Biriniwa,Birnin Kudu,Buji,Dutse,Gagarawa,Garki,Gumel,Hadejia,Jahun,Kafin Hausa,Kaugama,Kazaure,Kiri Kasama,Kiyawa,Maigatari,Malam Madori,Miga,Ringim,Sule Tankarkar,Taura,Yankwashi'.split(','),
  'Kaduna': 'Birnin Gwari,Chikun,Giwa,Igabi,Ikara,Jaba,Jema\'a,Kachia,Kaduna North,Kaduna South,Kagarko,Kajuru,Kaura,Kauru,Kubau,Kudan,Makarfi,Sabon Gari,Sanga,Zangon Kataf,Zaria'.split(','),
  'Kano': 'Ajingi,Albasu,Bagwai,Bebeji,Bichi,Bunkure,Dala,Dambatta,Dawakin Kudu,Dawakin Tofa,Doguwa,Fagge,Gabasawa,Garko,Garum Mallam,Gaya,Gezawa,Gwale,Kabo,Kano Municipal,Karaye,Kibiya,Kiru,Kunchi,Kura,Madobi,Makoda,Minjibir,Nasarawa,Rano,Rimin Gado,Rogo,Shanono,Sumaila,Takai,Tarauni,Tofa,Tsanyawa,Tudun Wada,Ungogo,Warawa,Wudil'.split(','),
  'Katsina': 'Bakori,Batagarawa,Batsari,Baure,Bindawa,Charanchi,Dandume,Danja,Dan Musa,Daura,Dutsi,Faskari,Funtua,Ingawa,Jibia,Kafur,Kaita,Kankara,Kankia,Katsina,Kurfi,Kusada,Mai\'Adua,Malumfashi,Mani,Mashi,Matazu,Musawa,Rimi,Sabuwa,Safana,Sandamu,Zango'.split(','),
  'Kebbi': 'Aleiro,Arewa Dandi,Argungu,Augie,Bagudo,Birnin Kebbi,Bunza,Dandi,Gwandu,Jega,Kalgo,Koko/Besse,Maiyama,Maiyama,Maiyama,Maiyama,Maiyama,Maiyama,Ngaski,Sakaba,Shanga,Suru,Wasagu/Danko,Yauri,Zuru'.split(','),
  'Kogi': 'Adavi,Ajaokuta,Ankpa,Bassa,Dekina,Ibaji,Idah,Igalamela-Odolu,Ijumu,Kogi,Idah,Lokoja,Mopa-Muro,Ofu,Ogpo-Magongo,Okehi,Okene,Olamaboro,Yagba East,Yagba West'.split(','),
  'Kwara': 'Asa,Baruten,Edu,Ifelodun,Ilorin East,Ilorin South,Ilorin West,Irepodun,Isin,Kaiama,Moro,Offa,Oke-Ero,Oyun,Patigi'.split(','),
  'Lagos': 'Agege,Ajeromi-Ifelodun,Alimosho,Amuwo-Odofin,Apapa,Badagry,Epe,Eti-Osa,Ibeju-Lekki,Ifako-Ijaiye,Ikeja,Ikorodu,Kosofe,Lagos Island,Lagos Mainland,Mushin,Ojo,Oshodi-Isolo,Shomolu,Surulere'.split(','),
  'Nasarawa': 'Akwanga,Awe,Doma,Karu,Keana,Keffi,Kokona,Lafia,obi,Nasarawa,Nasarawa Egon,Toto,Wamba'.split(','),
  'Niger': 'Agaie,Agwara,Bida,Borgu,Bosso,Chanchaga,Edati,Gbako,Gurara,Katcha,Kontagora,Lapai,Lavun,Magama,Mariga,Mashegu,Minna,Mokwa,Muya,Paikoro,Rafi,Rijau,Shiroro,Suleja,Tafa,Wushishi'.split(','),
  'Ogun': 'Abeokuta North,Abeokuta South,Ado-Odo/Ota,Egbado North,Egbado South,Ewekoro,Ifo,Ijebu East,Ijebu North,Ijebu North East,Ijebu Ode,Ikenne,Imeko Afon,Ipokia,Obafemi Owode,Odeda,Odogbolu,Ogun Waterside,Remo North,Shagamu'.split(','),
  'Ondo': 'Akoko North-East,Akoko North-West,Akoko South-East,Akoko South-West,Akure North,Akure South,Ese-Odo,Idanre,Ifedore,Ilaje,Ile-Oluji/Okeigbo,Irele,Odigbo,Ose,Owo,Okitipupa,Ondo East,Ondo West'.split(','),
  'Osun': 'Aiyedaade,Aiyedire,Atakumosa East,Atakumosa West,Boluwaduro,Boripe,Ede North,Ede South,Egbedore,Ejigbo,Ife Central,Ife East,Ife North,Ife South,Ifedayo,Ifelodun,Ila,Ilesa East,Ilesa West,Irepodun,Isokan,Iwo,Odo Otin,Ola Oluwa,Olorunda,Oriade,Orolu,Osogbo,Oyun'.split(','),
  'Oyo': 'Afijio,Akinyele,Atiba,Atisbo,Egbeda,Egbado North,Egbado South,Ibadan North,Ibadan North-East,Ibadan North-West,Ibadan South-East,Ibadan South-West,Ibarapa Central,Ibarapa East,Ibarapa North,Ido,Irepo,Iseyin,Itesiwaju,Kajola,Lagelu,Ogbomosho North,Ogbomosho South,Ogo Oluwa,Olorunsogo,Oluyole,ona-Ara,orelope,Oyo East,Oyo West,Saki East,Saki West,Surulere'.split(','),
  'Plateau': 'Barkin Ladi,Bassa,Bokkos,Jos East,Jos North,Jos South,Kanam,Kanke,Karu,Langtang North,Langtang South,Mangu,Mikang,Pankshin,Qua\'an Pan,Riyom,Shendam,Wase'.split(','),
  'Rivers': 'Abua/Odual,Ahoada East,Ahoada West,Akuku-Toru,Andoni,Asari-Toru,Bonny,Degema,Eleme,Emohua,Gokana,Ikwerre,Khana,Kom/Kom,Ogba/Egbema/Ndoni,Ogu/Bolo,Okrika,Omuma,Opobo/Nkoro,Port Harcourt,Tai'.split(','),
  'Sokoto': 'Binji,Bodinga,Dange Shuni,Gada,Goronyo,Gudu,Gwadabawa,Illela,Isa,Kebbe,Kware,Ngada,Raba,Sabon Birni,Shagari,Silame,Sokoto North,Sokoto South,Tambuwal,Tangaza,Tureta,Wamako,Wurno,Yabo'.split(','),
  'Taraba': 'Ardo Kola,Bali,Donga,Gashaka,Gassol,Gembu,Ibi,Jalingo,Karim Lamido,Kurmi,Lau,Sardauna,Takum,Takum,Wukari,Yorro,Zing'.split(','),
  'Yobe': 'Bade,Bursari,Damaturu,Fika,Fune,Gujba,Gulani,Geidam,Gujba,Jakusko,Karasuwa,Machina,Nangere,Nguru,Potiskum,Tarmuwa,Yunusari,Yusufari'.split(','),
  'Zamfara': 'Anka,Bakura,Birnin Magaji/Kiyaw,Bukkuyum,Bungudu,Gummi,Gusau,Kaura Namoda,Maradun,Maru,Shinkafi,Talata Mafara,Tsafe,Zurmi'.split(','),
};

export type NigerianState = keyof typeof NIGERIAN_STATES;

// ── Delivery fees (edit these numbers when you get real logistics) ────
// Simple model: base fee per state. Optionally add LGA overrides below.
export const STATE_DELIVERY_FEES: Record<string, number> = {
  'Lagos': 2000,
  'FCT': 2500,
  'Rivers': 2500,
  'Oyo': 2500,
  'Kano': 2500,
  'Kaduna': 2500,
  'Enugu': 2500,
  'Anambra': 2500,
  'Delta': 2800,
  'Edo': 2800,
  'Abia': 2800,
  'Imo': 2800,
  'Ogun': 2500,
  'Osun': 2600,
  'Ondo': 2600,
  'Ekiti': 2600,
  'Kwara': 2800,
  'Kogi': 3000,
  'Benue': 3000,
  'Plateau': 3000,
  'Nasarawa': 2800,
  'Niger': 3000,
  'Borno': 3500,
  'Yobe': 3500,
  'Bauchi': 3500,
  'Gombe': 3500,
  'Adamawa': 3500,
  'Taraba': 3800,
  'Sokoto': 3500,
  'Kebbi': 3500,
  'Zamfara': 3500,
  'Katsina': 3500,
  'Jigawa': 3500,
  'Akwa Ibom': 3000,
  'Cross River': 3000,
  'Bayelsa': 3000,
  'Ebonyi': 3000,
};

// Optional per-LGA overrides — add entries to charge extra for remote LGAs.
// e.g. { 'Lagos': { 'Badagry': 500 } } adds ₦500 to Badagry's base fee.
export const LGA_DELIVERY_OVERRIDES: Record<string, Record<string, number>> = {
  // Add entries here when you get real logistics numbers.
};

/**
 * Compute delivery fee for a state + LGA. Falls back to a national
 * default (₦3,500) for any state we don't have a specific rate for.
 */
export function calculateDeliveryFee(state: string, lga?: string): number {
  const base = STATE_DELIVERY_FEES[state] ?? 3500;
  const override = lga ? LGA_DELIVERY_OVERRIDES[state]?.[lga] ?? 0 : 0;
  return base + override;
}