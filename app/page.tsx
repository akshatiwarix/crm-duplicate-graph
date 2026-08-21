import { DEFAULT_CONFIG } from "@/lib/domain/defaults";
import { decodePermalink } from "@/lib/permalink";
import { Console } from "./console/Console";

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const encoded = typeof params.config === "string" ? params.config : undefined;

  let config = DEFAULT_CONFIG;
  if (encoded) {
    try {
      config = decodePermalink(encoded);
    } catch {
      config = DEFAULT_CONFIG;
    }
  }

  return <Console initialConfig={config} />;
}
