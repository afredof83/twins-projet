export const dynamic = 'force-dynamic'; // <--- LA CLÉ MAGIQUE

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {children}
        </>
    );
}
