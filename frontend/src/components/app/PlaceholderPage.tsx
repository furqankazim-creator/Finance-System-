interface PlaceholderPageProps {
  title: string;
  description: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-[980px] space-y-5">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#7f8279]">TGT FINANCE</p>
        <h1
          className="mt-1 text-[28px] leading-none text-[#1f352c]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {title}
        </h1>
        <p className="mt-2 text-[13px] text-[#6c726c]">{description}</p>
      </div>

      <div className="rounded-[10px] border border-[#d8d2c7] bg-[#fbfaf6] p-5 shadow-[0_1px_0_rgba(80,85,71,0.04)]">
        <p className="text-[14px] font-medium text-[#31443c]">{title} workspace</p>
        <p className="mt-2 text-[12px] text-[#6d746d]">
          This section is ready for API-backed data and can be expanded with forms, tables,
          and charts using the same ledger style as the rest of the app.
        </p>
        <p className="mt-4 text-[11px] text-[#7e857d]">
          The page scaffold is in place so we can keep iterating without breaking the routing.
        </p>
      </div>
    </div>
  );
}
