import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev-only : exécute en local les fonctions serverless Node de `webapp/api/*.js`
// (dvf, rent, market-stats) que `vite` ne sait pas lancer nativement — sinon Vite
// servirait le fichier source brut et `res.json()` planterait côté client.
// En prod (Vercel) ces fonctions tournent nativement. Si `VITE_API_BASE` est défini,
// les clients tapent ce déploiement en absolu et ce middleware n'est pas sollicité.
const LOCAL_API_HANDLERS = ['dvf', 'rent', 'market-stats']

function devApi() {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url || '').split('?')[0]
        const match = LOCAL_API_HANDLERS.find((name) => path === `/api/${name}`)
        if (!match) return next()
        try {
          const mod = await server.ssrLoadModule(`/api/${match}.js`)
          await mod.default(req, res)
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err?.message || 'dev api error' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), devApi()],
})
