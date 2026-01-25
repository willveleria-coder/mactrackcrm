// src/app/layout.js
import "./globals.css";
import SessionRefresh from '@/components/SessionRefresh'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionRefresh />
        {children}
      </body>
    </html>
  )
}

export const metadata = {
  title: "Mac Track CRM",
  description: "Courier CRM",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}