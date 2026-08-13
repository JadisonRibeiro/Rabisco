import { defineConfig, loadEnv } from 'vite';

/**
 * robots.txt e sitemap.xml precisam da URL pública, conhecida só em tempo de
 * build. Emiti-los aqui evita manter a mesma URL escrita à mão em arquivos
 * separados, que saem de sincronia na primeira troca de domínio.
 */
function arquivosDeIndexacao(siteUrl) {
  return {
    name: 'rabisco-indexacao',
    apply: 'build',
    generateBundle() {
      const hoje = new Date().toISOString().slice(0, 10);

      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: ['User-agent: *', 'Allow: /', '', `Sitemap: ${siteUrl}/sitemap.xml`, ''].join('\n'),
      });

      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          '  <url>',
          `    <loc>${siteUrl}/</loc>`,
          `    <lastmod>${hoje}</lastmod>`,
          '    <changefreq>monthly</changefreq>',
          '    <priority>1.0</priority>',
          '  </url>',
          '</urlset>',
          '',
        ].join('\n'),
      });
    },
  };
}

/**
 * O manifest aponta para ícones e para a raiz do app com caminhos absolutos.
 * Em public/ ele seria copiado literalmente e esses caminhos quebrariam sob
 * um subcaminho — como o /Rabisco/ do GitHub Pages. Emiti-lo aqui deixa base
 * e manifest saindo da mesma fonte, pelo mesmo motivo de robots e sitemap.
 */
function manifesto(base) {
  return {
    name: 'rabisco-manifesto',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'site.webmanifest',
        source: `${JSON.stringify(
          {
            name: 'Rabisco Papelaria',
            short_name: 'Rabisco',
            description: 'Papelaria, arte fina e serviços de balcão no Centro de Paragominas, PA.',
            lang: 'pt-BR',
            start_url: base,
            scope: base,
            display: 'standalone',
            background_color: '#FAF6F0',
            theme_color: '#C7300C',
            icons: [
              { src: `${base}icon-192.png`, sizes: '192x192', type: 'image/png' },
              { src: `${base}icon-512.png`, sizes: '512x512', type: 'image/png' },
              {
                src: `${base}icon-512-maskable.png`,
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
              },
            ],
          },
          null,
          2,
        )}\n`,
      });
    },
  };
}

/**
 * Troca %VITE_SITE_URL% e %BASE_URL% no HTML. A substituição nativa do Vite
 * alcança apenas atributos que ele reconhece: a URL aparece também dentro do
 * bloco JSON-LD, que para o parser é texto puro, e o manifest é emitido no
 * build — não está em public/, então o Vite não prefixa o base sozinho.
 */
function urlNoHtml(siteUrl, base) {
  return {
    name: 'rabisco-url-no-html',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replaceAll('%VITE_SITE_URL%', siteUrl).replaceAll('%BASE_URL%', base),
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const siteUrl = (env.VITE_SITE_URL ?? 'http://localhost:4173').replace(/\/$/, '');

  // O GitHub Pages serve o projeto em /Rabisco/, não na raiz do domínio. Sem
  // VITE_BASE cai em '/', que é o que dev e preview locais esperam.
  const caminho = (env.VITE_BASE ?? '').replace(/^\/|\/$/g, '');
  const base = caminho ? `/${caminho}/` : '/';

  return {
    root: 'src',
    publicDir: '../public',
    base,
    plugins: [urlNoHtml(siteUrl, base), arquivosDeIndexacao(siteUrl), manifesto(base)],
    build: {
      outDir: '../dist',
      emptyOutDir: true,
      assetsInlineLimit: 0,
      reportCompressedSize: true,
    },
  };
});
