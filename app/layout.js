export const metadata = {
  title: "Ecommerce Job Dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="bg-[#F8F9FA] antialiased">{children}</body>
    </html>
  );
}
