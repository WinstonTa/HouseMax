import type { ReactNode } from "react";

export const metadata = {
  title: "HouseMax",
  description: "By-right pathway engine for Southern California housing permits. Prototype only, not legal advice.",
};

// Placeholder shell. The frontend team replaces app/layout.tsx and app/page.tsx;
// everything under app/api and lib/ is the backend and should be kept as-is.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
