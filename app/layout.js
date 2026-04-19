import { Geist } from 'next/font/google';
import './globals.css';
import { SessionProvider } from './components/SessionProvider';

const geist = Geist({ subsets: ['latin'] });

export const metadata = {
  title: 'RocketHQ',
  description: 'Print Shop Operating System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={geist.className} style={{ margin: 0, padding: 0 }}>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
