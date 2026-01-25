import { Inter } from "next/font/google";
import "./globals.css";
import SessionRefresh from "@/components/SessionRefresh";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Mac Track CRM",
  description: "Delivery management system",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionRefresh />
        {children}
      </body>
    </html>
  );
}