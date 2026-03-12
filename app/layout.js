import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>{children}</body>
    </html>
  );
}
