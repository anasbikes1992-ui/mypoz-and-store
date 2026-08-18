import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-app-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  variable: "--font-app-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "MyPoz Commerce Cloud",
    template: "%s · MyPoz",
  },
  description:
    "Run your shop with MyPoz. Sell online with MyPoz — one catalogue, one inventory, one platform.",
  applicationName: "MyPoz Commerce Cloud",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-theme="dark"
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=document.cookie.match(/(?:^|; )mypoz_theme=([^;]*)/);var v=m?decodeURIComponent(m[1]):localStorage.getItem("mypoz_theme");if(v==="light"||v==="dark")document.documentElement.setAttribute("data-theme",v);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-surface-0 text-text-body">
        {children}
      </body>
    </html>
  );
}
