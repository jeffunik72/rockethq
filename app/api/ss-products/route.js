import { createClient } from "@supabase/supabase-js";

const SS_ACCOUNT = process.env.SS_ACCOUNT_NUMBER;
const SS_KEY = process.env.SS_API_KEY;
const BASE_URL = "https://api.ssactivewear.com/v2";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const brand = searchParams.get("brand") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 24;
    const skip = (page - 1) * limit;

    let url = BASE_URL + "/styles/?limit=" + limit + "&skip=" + skip;
    if (search) url += "&search=" + encodeURIComponent(search);
    if (brand) url += "&brandName=" + encodeURIComponent(brand);

    const credentials = Buffer.from(SS_ACCOUNT + ":" + SS_KEY).toString("base64");
    const res = await fetch(url, {
      headers: {
        "Authorization": "Basic " + credentials,
        "Accept": "application/json",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return Response.json({ error: "S&S API error: " + res.status }, { status: 400 });
    }

    const data = await res.json();
    return Response.json({ products: data, page, limit });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
