// Polymarket official category → tag_id mapping
// Sub-tags fetched via: GET /tags/{id}/related-tags/tags

interface Category {
  id: string;
  label: string;
  tagId: number | null;
  slug: string; // for related-tags endpoint
}

export const MAIN_CATEGORIES: Category[] = [
  { id: "trending", label: "Trending", tagId: null, slug: "" },
  { id: "new", label: "New", tagId: null, slug: "" },
  { id: "politics", label: "Politics", tagId: 2, slug: "politics" },
  { id: "sports", label: "Sports", tagId: 100639, slug: "sports" },
  { id: "crypto", label: "Crypto", tagId: 21, slug: "crypto" },
  { id: "finance", label: "Finance", tagId: 120, slug: "finance" },
  { id: "geopolitics", label: "Geopolitics", tagId: 100265, slug: "geopolitics" },
  { id: "tech", label: "Tech", tagId: 1401, slug: "tech" },
  { id: "culture", label: "Culture", tagId: 596, slug: "culture" },
];
