export interface RelayModel {
  name: string;
  defaultManufacturer: string;
}

export interface ManufacturerRelays {
  manufacturer: string;
  models: string[];
}

export const COMMONLY_USED_RELAYS: ManufacturerRelays[] = [
  {
    manufacturer: "Pextron",
    models: ["URPE 7104", "URPE 6000", "URP 2000", "URPE 7104 G", "URP 6000", "URP 2500", "URPE 7102"]
  },
  {
    manufacturer: "ZIV",
    models: ["IRV", "IDV", "IFV", "ZIVer"]
  },
  {
    manufacturer: "Orion",
    models: ["Orion Italia", "Orion Pextron Series"]
  },
  {
    manufacturer: "Elo",
    models: ["Elo 2102", "Elo 2104"]
  },
  {
    manufacturer: "Schneider Electric",
    models: ["MiCOM P132", "MiCOM P139", "Sepam Series 20", "Sepam Series 40", "Sepam Series 80", "Vamp 57"]
  },
  {
    manufacturer: "ABB",
    models: ["REF 615", "REF 541", "REF 543", "REM 615", "REJ 603"]
  },
  {
    manufacturer: "Siemens",
    models: ["Siprotec 7SJ62", "Siprotec 7SJ80", "Siprotec 7SJ82", "7SR11"]
  },
  {
    manufacturer: "SEL (Schweitzer)",
    models: ["SEL-751", "SEL-751A", "SEL-351S", "SEL-551"]
  },
  {
    manufacturer: "General Electric (GE)",
    models: ["Multilin 750", "Multilin F650", "Multilin F35"]
  },
  {
    manufacturer: "Areva / Alstom",
    models: ["MiCOM P111", "MiCOM P122", "MiCOM P123"]
  },
  {
    manufacturer: "WEG",
    models: ["RPW"]
  },
  {
    manufacturer: "Comap",
    models: ["MainsPro"]
  }
];
