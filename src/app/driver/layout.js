import PWARegister from "./PWARegister";

export const metadata = {
  title: "Mac Track Driver",
  manifest: "/driver-manifest.webmanifest",
  themeColor: "#0072ab"
};

export default function DriverLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}