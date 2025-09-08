import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Legal - helpNINJA',
    description: 'Legal information, privacy policy, terms of service, and data policies for helpNINJA.',
};

export default function LegalLayout({ children }: { children: React.ReactNode }) {
    return children;
}
