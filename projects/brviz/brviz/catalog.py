"""Country and indicator catalogs.

Donor pool from Carrasco, Duarte, Pinho de Mello (PUC-Rio TD 626, 2014)
plus Korea/Czechia as 1990-club graduates and WB aggregates.
"""

COUNTRIES = {
    "BRA": {"name": "Brazil", "group": "treated"},
    "ARG": {"name": "Argentina", "group": "paper"},
    "CHL": {"name": "Chile", "group": "paper"},
    "COL": {"name": "Colombia", "group": "paper"},
    "ECU": {"name": "Ecuador", "group": "paper"},
    "MEX": {"name": "Mexico", "group": "paper"},
    "PER": {"name": "Peru", "group": "paper"},
    "URY": {"name": "Uruguay", "group": "paper"},
    "BGR": {"name": "Bulgaria", "group": "paper"},
    "HUN": {"name": "Hungary", "group": "paper"},
    "POL": {"name": "Poland", "group": "paper"},
    "RUS": {"name": "Russian Federation", "group": "paper"},
    "TUR": {"name": "Turkiye", "group": "paper"},
    "UKR": {"name": "Ukraine", "group": "paper"},
    "CHN": {"name": "China", "group": "paper"},
    "IND": {"name": "India", "group": "paper"},
    "IDN": {"name": "Indonesia", "group": "paper"},
    "MYS": {"name": "Malaysia", "group": "paper"},
    "THA": {"name": "Thailand", "group": "paper"},
    "ZAF": {"name": "South Africa", "group": "paper"},
    "KOR": {"name": "Korea, Rep.", "group": "aspirational"},
    "CZE": {"name": "Czechia", "group": "aspirational"},
    "UMC": {"name": "Upper middle income", "group": "aggregate"},
    "LCN": {"name": "Latin America & Caribbean", "group": "aggregate"},
}

# UMC rows come back with empty iso3code.
NAME_TO_ISO = {
    "Upper middle income": "UMC",
    "Latin America & Caribbean": "LCN",
}

CORE_INDICATORS = {
    "gdp_pc_ppp": ("NY.GDP.PCAP.PP.KD", "GDP per capita PPP (const 2021 intl $)"),
    "gdp_per_employed": (
        "SL.GDP.PCAP.EM.KD",
        "GDP per person employed (const 2021 PPP $)",
    ),
    "investment": ("NE.GDI.TOTL.ZS", "Gross capital formation (% GDP)"),
    "trade": ("NE.TRD.GNFS.ZS", "Trade (% GDP)"),
}

WAVE2_INDICATORS = {
    "savings": ("NY.GNS.ICTR.ZS", "Gross savings (% GDP)"),
    "inflation": ("FP.CPI.TOTL.ZG", "Inflation, consumer prices (%)"),
    "manufacturing": ("NV.IND.MANF.ZS", "Manufacturing VA (% GDP)"),
    "gini": ("SI.POV.GINI", "Gini"),
    "poverty_365": ("SI.POV.LMIC", "Poverty $4.20/day (%)"),
    "poverty_830": ("SI.POV.UMIC", "Poverty $8.30/day (%)"),
    "undernourish": ("SN.ITK.DEFC.ZS", "Undernourishment (% pop)"),
    "edu_spend": ("SE.XPD.TOTL.GD.ZS", "Gov education spend (% GDP)"),
    "reg_quality": ("GOV_WGI_RQ.EST", "WGI Regulatory Quality"),
    "rule_of_law": ("GOV_WGI_RL.EST", "WGI Rule of Law"),
    "tot": ("TT.PRI.MRCH.XD.WD", "Net barter terms of trade (2015=100)"),
}

EXTRA_INDICATORS = {
    "gdp_pc_usd": ("NY.GDP.PCAP.CD", "GDP per capita (current US$)"),
    "fdi": ("BX.KLT.DINV.WD.GD.ZS", "FDI net inflows (% GDP)"),
    "edu_tertiary": ("SE.TER.ENRR", "Tertiary enrollment, gross (%)"),
    "internet": ("IT.NET.USER.ZS", "Internet users (% pop)"),
    "tfr": ("SP.DYN.TFRT.IN", "Fertility (births per woman)"),
    "old_age": ("SP.POP.65UP.TO.ZS", "Population 65+ (%)"),
}


def country_codes() -> str:
    return ";".join(COUNTRIES)


def indicators(*, extra: bool) -> dict[str, tuple[str, str]]:
    out = dict(CORE_INDICATORS)
    out.update(WAVE2_INDICATORS)
    if extra:
        out.update(EXTRA_INDICATORS)
    return out
