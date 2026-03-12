import "./globals.css";

export const metadata = {
  title: "Ecommerce Job Dashboard",
  description: "Quick job finder for POD & Amazon Sellers",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <script src="https://cdn.tailwindcss.com"></script>
      <body>{children}</body>
    </html>
  );
}
