import {
  newId,
  storeConfigSchema,
  type StoreConfig,
  type StorePage,
  type StoreSection,
} from "./schema";

function section(type: StoreSection["type"], settings: Record<string, unknown>): StoreSection {
  return { id: newId("sec"), type, enabled: true, settings };
}

function page(
  type: StorePage["type"],
  title: string,
  slug: string,
  sections: StoreSection[] = [],
): StorePage {
  return {
    id: newId("pg"),
    type,
    title,
    slug,
    visible: true,
    seoTitle: "",
    seoDescription: "",
    sections,
    blocks: [],
  };
}

export function defaultHomeSections(): StoreSection[] {
  return [
    section("announcement", {
      message: "Free delivery on orders above LKR 10,000 · Islandwide",
      link: "/products",
      dismissible: false,
    }),
    section("hero", {
      heading: "Welcome to your new online store",
      subheading: "Start selling online with MyPoz. Your POS products appear here automatically.",
      ctaLabel: "Shop Now",
      ctaHref: "products",
      secondaryCtaLabel: "Order via WhatsApp",
      secondaryCtaHref: "whatsapp",
      alignment: "left",
      height: "regular",
      overlay: 40,
      image: "",
    }),
    section("categories", {
      title: "Shop by category",
    }),
    section("featured_collection", {
      title: "Featured",
      productCount: 8,
      collection: "all",
    }),
    section("trust", {
      items: [
        { title: "Cash on delivery", body: "Pay when you receive" },
        { title: "Islandwide delivery", body: "We deliver across Sri Lanka" },
        { title: "Secure checkout", body: "Your order is confirmed in MyPoz" },
        { title: "Easy pickup", body: "Collect from the shop" },
      ],
    }),
    section("image_text", {
      heading: "Run your shop. Sell online.",
      description:
        "Every product, price, and stock figure comes from the same MyPoz catalogue you use at the counter. No second inventory to maintain.",
      ctaLabel: "Browse products",
      ctaHref: "products",
      imagePosition: "right",
    }),
  ];
}

export function defaultStoreConfig(partial: Partial<StoreConfig> = {}): StoreConfig {
  const name = partial.name || "MyPoz Store";
  const slug = partial.slug || "main-store";
  const home = page("home", "Home", "home", defaultHomeSections());

  const base: StoreConfig = storeConfigSchema.parse({
    name,
    slug,
    description: "Official online store",
    status: "draft",
    themeId: "local",
    announcement: "Quality products · Fast local delivery · Best prices",
    seoTitle: `${name} — Online Store`,
    seoDescription: `Shop ${name} online. Live stock from the POS. Pickup or delivery.`,
    navigation: [
      { id: "n_home", label: "Home", href: "", children: [] },
      { id: "n_shop", label: "Shop", href: "products", children: [] },
      { id: "n_about", label: "About", href: "pages/about", children: [] },
      { id: "n_contact", label: "Contact", href: "pages/contact", children: [] },
    ],
    footerLinks: [
      { id: "f_ship", label: "Shipping", href: "pages/shipping", children: [] },
      { id: "f_ret", label: "Returns", href: "pages/returns", children: [] },
      { id: "f_pri", label: "Privacy", href: "pages/privacy", children: [] },
      { id: "f_ter", label: "Terms", href: "pages/terms", children: [] },
    ],
    collections: [
      {
        id: "c_new",
        title: "New Arrivals",
        slug: "new-arrivals",
        description: "",
        sourceCategory: "all",
        featured: true,
        collectionType: "automated",
        rules: [{ field: "tag", op: "eq", value: "new" }],
      },
      {
        id: "c_sale",
        title: "Under LKR 5,000",
        slug: "sale",
        description: "",
        sourceCategory: "all",
        featured: false,
        collectionType: "automated",
        rules: [{ field: "price", op: "lt", value: "5000" }],
      },
    ],
    delivery: {
      pickup: true,
      localDelivery: true,
      islandwide: true,
      freeThreshold: 10000,
      zones: [
        { id: "z_cmb", name: "Colombo", fee: 350 },
        { id: "z_out", name: "Outside Colombo", fee: 600 },
      ],
    },
    pages: [
      home,
      page("products", "Products", "products"),
      page("collections", "Collections", "collections"),
      page("about", "About", "about", [
        section("rich_text", {
          heading: `About ${name}`,
          content:
            "We run our shop on MyPoz — the same products you see in-store are available online, with live stock.",
        }),
      ]),
      page("contact", "Contact", "contact", [
        section("rich_text", {
          heading: "Contact us",
          content: "Call, WhatsApp, or visit the shop. Online orders land on the same counter.",
        }),
      ]),
      page("shipping", "Shipping", "shipping", [
        section("rich_text", {
          heading: "Delivery",
          content:
            "Colombo: LKR 350. Outside Colombo: LKR 600. Free delivery on orders above LKR 10,000. Store pickup is free.",
        }),
      ]),
      page("returns", "Returns", "returns", [
        section("rich_text", {
          heading: "Returns",
          content: "Contact us within 7 days of delivery for unused items in original condition.",
        }),
      ]),
      page("privacy", "Privacy", "privacy", [
        section("rich_text", {
          heading: "Privacy",
          content: "We use your details only to fulfil orders and support your account.",
        }),
      ]),
      page("terms", "Terms", "terms", [
        section("rich_text", {
          heading: "Terms",
          content: "Orders are confirmed when stock is reserved in MyPoz. Prices are revalidated at checkout.",
        }),
      ]),
      page("faq", "FAQ", "faq", [
        section("rich_text", {
          heading: "FAQ",
          content:
            "Can I pay cash on delivery? Yes. Can I pick up in store? Yes. Is stock live? Yes — the same inventory as the POS.",
        }),
      ]),
    ],
    ...partial,
  });

  return base;
}

/** Development demo merchandising — Lanka Streetwear. Products still come from POS. */
export function lankaStreetwearDefaults(): Partial<StoreConfig> {
  return {
    name: "Lanka Streetwear",
    slug: "lanka-streetwear",
    description: "Colombo streetwear. Same stock in-store and online.",
    themeId: "fashion",
    announcement: "New drop · Islandwide COD · Free delivery over LKR 10,000",
    seoTitle: "Lanka Streetwear — Official Store",
    seoDescription: "Classic tees, cargos, sneakers. Shop Colombo streetwear online with MyPoz.",
    collections: [
      {
        id: "c_new",
        title: "New Arrivals",
        slug: "new-arrivals",
        description: "This week's drop",
        sourceCategory: "all",
        featured: true,
        collectionType: "automated",
        rules: [{ field: "tag", op: "eq", value: "new" }],
      },
      {
        id: "c_men",
        title: "Men's",
        slug: "mens",
        description: "",
        sourceCategory: "all",
        featured: true,
        collectionType: "manual",
        rules: [],
      },
      {
        id: "c_street",
        title: "Streetwear",
        slug: "streetwear",
        description: "",
        sourceCategory: "all",
        featured: true,
        collectionType: "manual",
        rules: [],
      },
      {
        id: "c_sale",
        title: "Sale",
        slug: "sale",
        description: "Under LKR 5,000",
        sourceCategory: "all",
        featured: false,
        collectionType: "automated",
        rules: [{ field: "price", op: "lt", value: "5000" }],
      },
    ],
  };
}
