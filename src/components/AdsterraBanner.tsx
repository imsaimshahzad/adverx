import { useMemo } from "react";

const ADSTERRA_KEY = "88bbf794ef32a2268f5b525021b6c766";

export function AdsterraBanner() {
  const srcDoc = useMemo(
    () => `<!doctype html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:transparent">
<script>
  atOptions = {
    'key' : '${ADSTERRA_KEY}',
    'format' : 'iframe',
    'height' : 250,
    'width' : 300,
    'params' : {}
  };
</script>
<script src="https://www.highrevenueformat.com/${ADSTERRA_KEY}/invoke.js"></script>
</body>
</html>`,
    [],
  );

  return (
    <section className="my-6 flex w-full flex-col items-center gap-2" aria-label="Advertisement">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground">
        Advertisement
      </p>
      <div className="flex w-full justify-center">
        <div className="h-[250px] w-[min(300px,calc(100vw-32px))] max-w-full overflow-hidden rounded-sm bg-transparent">
          <iframe
            srcDoc={srcDoc}
            title="Advertisement"
            width={300}
            height={250}
            style={{ display: "block", width: "100%", height: "250px", border: 0, background: "transparent" }}
            scrolling="no"
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
          />
        </div>
      </div>
    </section>
  );
}
