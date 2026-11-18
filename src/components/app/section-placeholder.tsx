export function SectionPlaceholder({ title }: { title: string }) {
  return (
    <div>
      <h1 className="font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
        {title}
      </h1>
      <p className="mt-3 text-muted-foreground">
        Esta área ainda está em desenvolvimento.
      </p>
    </div>
  );
}
