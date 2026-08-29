import type { Geography, Sector } from "./types";

const sectorTerms: Record<Sector, readonly string[]> = {
  "climate tech": ["climate tech", "climatetech", "cleantech", "clean tech", "renewable", "carbon", "energy transition", "sustainability", "solar", "hydrogen"],
  "artificial intelligence": ["artificial intelligence", "machine learning", "generative ai", "ai"],
  fintech: ["fintech", "financial technology", "payments", "banking software", "insurtech"],
  "health tech": ["health tech", "healthtech", "digital health", "medtech", "medical technology"],
  mobility: ["mobility", "transportation", "automotive", "logistics", "electric vehicle", "ev charging"],
  "deep tech": ["deep tech", "deeptech", "quantum", "robotics", "advanced materials", "semiconductor", "space tech"],
  biotech: ["biotech", "biotechnology", "life sciences", "therapeutics", "drug discovery"],
  "enterprise software": ["enterprise software", "b2b software", "business software", "workflow software", "saas"],
};

const geographyTerms: Record<Geography, readonly string[]> = {
  Barcelona: ["barcelona"],
  Catalonia: ["catalonia", "catalunya", "barcelona", "girona", "tarragona", "lleida"],
  Spain: ["spain", "espana", "spanish", "barcelona", "madrid", "valencia", "bilbao", "seville", "sevilla", "malaga", "zaragoza"],
  "Southern Europe": [
    "southern europe", "spain", "espana", "portugal", "italy", "italia", "greece", "malta", "cyprus", "slovenia", "croatia", "barcelona", "madrid", "lisbon", "lisboa", "porto", "milan", "milano", "rome", "roma", "athens",
  ],
  Europe: [
    "europe", "european", "spain", "portugal", "france", "germany", "italy", "greece", "netherlands", "belgium", "luxembourg", "ireland", "austria", "switzerland", "denmark", "sweden", "norway", "finland", "iceland", "poland", "czechia", "czech republic", "slovakia", "hungary", "romania", "bulgaria", "slovenia", "croatia", "estonia", "latvia", "lithuania", "malta", "cyprus", "united kingdom", "uk", "barcelona", "madrid", "lisbon", "paris", "berlin", "munich", "milan", "rome", "amsterdam", "brussels", "dublin", "vienna", "zurich", "stockholm", "oslo", "helsinki", "warsaw", "prague", "bucharest", "tallinn", "london",
  ],
};

export function sectorEvidenceTerms(sector: Sector): readonly string[] {
  return sectorTerms[sector];
}

export function geographyEvidenceTerms(geography: Geography): readonly string[] {
  return geographyTerms[geography];
}
