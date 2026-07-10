import { createApp } from './app';
import { env } from './config/env';
import { warmEmbeddings } from './lib/embeddings';

const app = createApp();

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`\nARB ResearchHub API on http://localhost:${env.port}  (${env.nodeEnv})`);
  // eslint-disable-next-line no-console
  console.log(`   Storage: ${env.storage.driver} | Groq AI search: ${env.groq.apiKey ? 'enabled' : 'disabled (keyword only)'}`);
  if (env.embedding.warmOnStart) warmEmbeddings();
});
