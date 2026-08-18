"use client";

import { useState, useEffect } from "react";
import type { Product } from "@/lib/types";

export default function MarketingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [platform, setPlatform] = useState<"facebook" | "instagram" | "whatsapp" | "google">("facebook");
  const [generatedCopy, setGeneratedCopy] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setProducts(data.data);
          if (data.data.length > 0) setSelectedProduct(data.data[0]);
        }
      })
      .catch(console.error);
  }, []);

  const generateAdCopy = () => {
    if (!selectedProduct) return;
    const name = selectedProduct.name;
    const price = `LKR ${selectedProduct.salePrice.toLocaleString("en-LK")}`;

    let copy = "";
    if (platform === "facebook") {
      copy = `🔥 SPECIAL OFFER: ${name}! 🔥\n\nUpgrade your daily routine with ${name} available now at an unbeatable price of ${price}.\n\n✅ 100% Genuine Quality\n✅ Fast Islandwide Delivery\n✅ Cash on Delivery Available\n\n👉 Order Online Now: https://grabber-pos.vercel.app/store/main-store\n💬 Or message us on WhatsApp to order instantly!`;
    } else if (platform === "instagram") {
      copy = `✨ NEW ARRIVAL: ${name} ✨\n\nGet yours today for only ${price}! Limited stock available. 🛍️\n\nTap the link in bio to shop online! 📦✨\n\n#shopping #onlinestore #fastdelivery #bestdeals #${name.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    } else if (platform === "whatsapp") {
      copy = `👋 Hello! Check out our featured product of the week:\n\n🛍️ *${name}*\n🏷️ *Price:* ${price}\n🚚 *Delivery:* Fast Cash on Delivery\n\n👇 Click to buy online:\nhttps://grabber-pos.vercel.app/store/main-store`;
    } else if (platform === "google") {
      copy = `Headline 1: Buy ${name} Online\nHeadline 2: Best Price ${price} - Fast Delivery\nDescription: Shop ${name} at official store. High quality, authentic products, fast cash on delivery.`;
    }

    setGeneratedCopy(copy);
  };

  useEffect(() => {
    generateAdCopy();
  }, [selectedProduct, platform]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <span>🚀 AI Marketing & Social Ads Generator</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Generate promotional social media posts, WhatsApp broadcast messages, and Google Search Ads copy directly from your POS catalog.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Select Product</label>
            <select
              value={selectedProduct?.id || ""}
              onChange={(e) => {
                const found = products.find((p) => p.id === e.target.value);
                if (found) setSelectedProduct(found);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (LKR {p.salePrice})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Target Platform</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPlatform("facebook")}
                className={`p-2.5 rounded-xl text-xs font-bold border transition ${
                  platform === "facebook"
                    ? "bg-sky-500/10 text-sky-400 border-sky-500"
                    : "bg-slate-950 text-slate-400 border-slate-800"
                }`}
              >
                📘 Facebook
              </button>
              <button
                type="button"
                onClick={() => setPlatform("instagram")}
                className={`p-2.5 rounded-xl text-xs font-bold border transition ${
                  platform === "instagram"
                    ? "bg-sky-500/10 text-sky-400 border-sky-500"
                    : "bg-slate-950 text-slate-400 border-slate-800"
                }`}
              >
                📸 Instagram
              </button>
              <button
                type="button"
                onClick={() => setPlatform("whatsapp")}
                className={`p-2.5 rounded-xl text-xs font-bold border transition ${
                  platform === "whatsapp"
                    ? "bg-sky-500/10 text-sky-400 border-sky-500"
                    : "bg-slate-950 text-slate-400 border-slate-800"
                }`}
              >
                💬 WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setPlatform("google")}
                className={`p-2.5 rounded-xl text-xs font-bold border transition ${
                  platform === "google"
                    ? "bg-sky-500/10 text-sky-400 border-sky-500"
                    : "bg-slate-950 text-slate-400 border-slate-800"
                }`}
              >
                🔍 Google Ads
              </button>
            </div>
          </div>
        </div>

        {/* Output Preview */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Generated {platform} Ad Copy
              </span>
              <button
                onClick={handleCopy}
                className="bg-sky-500 hover:bg-sky-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
              >
                {copied ? "✓ Copied!" : "📋 Copy to Clipboard"}
              </button>
            </div>

            <textarea
              readOnly
              rows={10}
              value={generatedCopy}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm font-mono text-slate-200 focus:outline-none leading-relaxed"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
            <span>💡 Tip: Paste this directly into Meta Ads Manager, WhatsApp groups, or social posts!</span>
            <div className="flex flex-wrap gap-3">
              <a
                href="/api/store/main-store/feed/google"
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:underline font-semibold"
              >
                Google feed
              </a>
              <a
                href="/api/store/main-store/feed/meta"
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:underline font-semibold"
              >
                Meta feed
              </a>
              <a
                href="https://grabber-pos.vercel.app/store/main-store"
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:underline font-semibold"
              >
                View Live Storefront →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
