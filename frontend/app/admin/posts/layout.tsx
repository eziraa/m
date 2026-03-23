interface LayoutProps {
  children: React.ReactNode;
}

export default function AdminPostsLayout({ children }: LayoutProps) {
  return (
    <div className="relative h-screen max-w-100! max-h-screen overflow-y-auto custom-scrollbar">
      {children}
    </div>
  );
}
