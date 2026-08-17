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
 * Página de erro do GitHub Pages.
 *
 * Sem um 404.html na raiz do dist, qualquer endereço errado cai na página
 * genérica do GitHub — fundo branco, mascote e nenhuma menção à Rabisco. Quem
 * digitou o link errado não tem por onde voltar.
 *
 * Sai daqui pelo mesmo motivo do manifest: o caminho de volta para a home
 * depende do `base`, que só existe em tempo de build. Em public/ o arquivo
 * seria copiado literal e o link quebraria sob o /Rabisco/ do Pages.
 *
 * É deliberadamente autossuficiente — estilo embutido, sem fonte externa, sem
 * JS. Uma página de erro que depende do bundle é uma página de erro que falha
 * junto com ele.
 */
function paginaDeErro(base) {
  return {
    name: 'rabisco-404',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: '404.html',
        source: `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>Página não encontrada — Rabisco Papelaria</title>
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        min-height: 100svh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 18px;
        padding: 32px;
        text-align: center;
        background: #faf6f0;
        color: #14100e;
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      }
      h1 { margin: 0; font-size: clamp(30px, 7vw, 52px); line-height: 1.05; letter-spacing: -0.02em; }
      p { margin: 0; max-width: 44ch; font-size: 16px; line-height: 1.6; color: rgb(20 16 14 / 66%); }
      a {
        margin-top: 8px;
        padding: 15px 28px;
        border-radius: 999px;
        background: #14100e;
        color: #faf6f0;
        font-size: 12.5px;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        text-decoration: none;
      }
      a:hover { background: #c7300c; }
    </style>
  </head>
  <body>
    <h1>Esta página não existe</h1>
    <p>
      O endereço que você abriu não leva a lugar nenhum — mas a loja continua na Rua Sete de Setembro, 36, no Centro de
      Paragominas.
    </p>
    <a href="${base}">Voltar para o início</a>
  </body>
</html>
`,
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
    plugins: [
      urlNoHtml(siteUrl, base),
      arquivosDeIndexacao(siteUrl),
      manifesto(base),
      paginaDeErro(base),
    ],
    build: {
      outDir: '../dist',
      emptyOutDir: true,
      assetsInlineLimit: 0,
      reportCompressedSize: true,
    },
  };
});
