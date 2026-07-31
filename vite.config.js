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
 * Troca %VITE_SITE_URL% no HTML. A substituição nativa do Vite alcança
 * apenas atributos que ele reconhece; aqui a URL aparece também dentro do
 * bloco JSON-LD, que para o parser é texto puro.
 */
function urlNoHtml(siteUrl) {
  return {
    name: 'rabisco-url-no-html',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replaceAll('%VITE_SITE_URL%', siteUrl),
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const siteUrl = (env.VITE_SITE_URL ?? 'http://localhost:4173').replace(/\/$/, '');

  return {
    root: 'src',
    publicDir: '../public',
    plugins: [urlNoHtml(siteUrl), arquivosDeIndexacao(siteUrl)],
    build: {
      outDir: '../dist',
      emptyOutDir: true,
      assetsInlineLimit: 0,
      reportCompressedSize: true,
    },
  };
});
