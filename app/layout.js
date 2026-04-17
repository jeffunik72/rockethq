import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({ subsets: ['latin'] });

export const metadata = {
  title: 'RocketHQ',
  description: 'Print Shop Operating System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={geist.className} style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}