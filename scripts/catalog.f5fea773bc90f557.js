// The public storefront uses only catalogue reads. Analytics has its own transport.
const catalogue = (() => {
  const origin = 'https://vouudpwvkqxqdqmcptgo.supabase.co';
  const publishableKey = 'sb_publishable_PARbVrHu0FK4X2i2VthZ6Q_G65VYWjq';
  const queries = {
    categories: 'select=id,name,parent_id&order=name,id',
    products: 'select=id,name,brand,description,category_id,image_url,product_variants(id,size,price,sale_price,in_stock)&is_active=eq.true&order=created_at.desc,id',
    promotions: 'select=id,name,discount_percent,required_quantity,is_active,starts_at,ends_at,promotion_products(variant_id)&is_active=eq.true&order=id',
  };

  async function read(table) {
    const pageSize = 200;
    const rows = [];
    for (;;) {
      const url = new URL('/rest/v1/' + table, origin);
      url.search = queries[table];
      url.searchParams.set('offset', String(rows.length));
      url.searchParams.set('limit', String(pageSize));
      const response = await fetch(url, {
        headers: {apikey: publishableKey},
        credentials: 'omit',
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error('Catalogue request failed (' + response.status + ')');
      const page = await response.json();
      if (!Array.isArray(page)) throw new Error('Invalid catalogue response');
      rows.push(...page);
      if (page.length < pageSize) return rows;
    }
  }
  return {origin, read};
})();
