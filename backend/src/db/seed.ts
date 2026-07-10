import { pool, query } from './pool';
import { env } from '../config/env';
import { hashPassword } from '../utils/auth';
import { embed } from '../lib/embeddings';

interface SeedPaper {
  title: string;
  abstract: string;
  department: string;
  session: string;
  tags: string[];
  body: string;
}

const PAPERS: SeedPaper[] = [
  {
    title: 'Solar-Powered Smart Irrigation for Small-Scale Farms in Lagos State',
    abstract:
      'This project designs a low-cost, solar-powered automatic irrigation system that uses soil-moisture sensors and a microcontroller to water crops only when needed, reducing water use by up to 40% compared to manual irrigation.',
    department: 'Electrical & Electronics Engineering',
    session: '2024/2025',
    tags: ['renewable energy', 'IoT', 'agriculture', 'embedded systems'],
    body: 'The system integrates a photovoltaic panel, a charge controller, a 12V battery, capacitive soil moisture sensors and an ESP32 microcontroller. When the sensor reading falls below a configurable threshold a relay opens a solenoid valve. Field testing over eight weeks showed a 38% reduction in water consumption while maintaining crop yield. The paper discusses power budgeting, sensor calibration and the cost analysis for smallholder adoption.',
  },
  {
    title: 'Finite Element Analysis of Reinforced Concrete Beams under Cyclic Loading',
    abstract:
      'A numerical study using the finite element method to predict crack propagation and failure modes in reinforced concrete beams subjected to repeated cyclic loads, validated against laboratory specimens.',
    department: 'Civil & Environmental Engineering',
    session: '2024/2025',
    tags: ['structural engineering', 'finite element method', 'concrete', 'simulation'],
    body: 'Beams were modelled in ABAQUS using a concrete damaged plasticity model. Reinforcement was represented with embedded truss elements. Predicted load-deflection curves agreed with experimental results within 9%. The study identifies stirrup spacing as the dominant factor governing shear failure under cyclic loading and proposes a revised detailing guideline for seismic zones.',
  },
  {
    title: 'A Convolutional Neural Network for Malaria Parasite Detection in Blood Smears',
    abstract:
      'This work trains a deep convolutional neural network to automatically detect Plasmodium parasites in microscope images of blood smears, achieving 96% accuracy and offering a screening aid for under-resourced clinics.',
    department: 'Computer Engineering',
    session: '2023/2024',
    tags: ['machine learning', 'deep learning', 'medical imaging', 'healthcare'],
    body: 'A dataset of 27,000 segmented red blood cell images was used to train a CNN with three convolutional blocks and dropout regularisation. Data augmentation with rotation and flipping improved generalisation. The model reached 96.2% accuracy and an F1 score of 0.95. A lightweight version was ported to run on a mobile phone for point-of-care screening where laboratory microscopists are unavailable.',
  },
  {
    title: 'Optimisation of Biodiesel Production from Waste Cooking Oil',
    abstract:
      'An experimental investigation of transesterification parameters to maximise biodiesel yield from waste cooking oil, presenting an optimal catalyst concentration and reaction temperature for sustainable fuel production.',
    department: 'Chemical Engineering',
    session: '2024/2025',
    tags: ['biofuel', 'sustainability', 'process optimisation', 'renewable energy'],
    body: 'Waste cooking oil was converted to biodiesel via base-catalysed transesterification using potassium hydroxide and methanol. A response surface methodology varied catalyst loading, methanol-to-oil ratio and temperature. Maximum yield of 94% was obtained at 1% catalyst, 6:1 molar ratio and 60 degrees Celsius. Fuel properties met ASTM D6751 standards, demonstrating a viable circular-economy pathway for urban waste oil.',
  },
  {
    title: 'Traffic Flow Prediction on Lagos Roads using LSTM Recurrent Networks',
    abstract:
      'This project applies long short-term memory recurrent neural networks to historical traffic sensor data to forecast congestion on major Lagos corridors up to thirty minutes ahead.',
    department: 'Computer Engineering',
    session: '2024/2025',
    tags: ['machine learning', 'time series', 'smart city', 'transportation'],
    body: 'Traffic speed data collected from GPS probes was aggregated into five-minute intervals. An LSTM network with two hidden layers was trained to predict speed thirty minutes ahead, outperforming an ARIMA baseline by 22% in mean absolute error. The paper explores how such short-horizon forecasts could feed an adaptive traffic-signal controller to ease congestion during peak hours.',
  },
  {
    title: 'Design and Fabrication of a Low-Cost Prosthetic Hand with 3D Printing',
    abstract:
      'A mechanical design and prototype of an affordable, 3D-printed prosthetic hand actuated by tendon cables, intended to restore basic grasping function for amputees at a fraction of commercial cost.',
    department: 'Mechanical Engineering',
    session: '2023/2024',
    tags: ['biomechanics', '3D printing', 'assistive technology', 'robotics'],
    body: 'The hand was designed in Fusion 360 and printed in PLA. Finger flexion is driven by nylon tendons pulled by servo motors mounted in the forearm, controlled by surface electromyography signals from the residual limb. Total material cost was under 90 US dollars. Grasp force and durability testing demonstrated the ability to hold everyday objects such as a bottle and a pen.',
  },
];

async function upsertAdmin() {
  const email = env.seedAdmin.email.toLowerCase();
  const hash = await hashPassword(env.seedAdmin.password);
  await query(
    `INSERT INTO users (name, email, password_hash, role, is_verified)
     VALUES ($1, $2, $3, 'admin', TRUE)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin', is_verified = TRUE`,
    [env.seedAdmin.name, email, hash]
  );
  console.log(`✅ Admin ready: ${email} / ${env.seedAdmin.password}`);
}

async function upsertStudent() {
  const email = `demo.student@${env.allowedEmailDomain}`;
  const hash = await hashPassword('Student123!');
  const { rows } = await query<{ id: string }>(
    `INSERT INTO users (name, email, password_hash, role, department, matric_number, is_verified)
     VALUES ('Demo Student', $1, $2, 'student', 'Computer Engineering', 'ENG/2020/1234', TRUE)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id`,
    [email, hash]
  );
  console.log(`✅ Student ready: ${email} / Student123!`);
  return rows[0].id;
}

async function seedPapers(studentId: string) {
  const existing = await query<{ count: string }>(`SELECT COUNT(*)::int AS count FROM submissions`);
  if (Number(existing.rows[0].count) > 0) {
    console.log('ℹ️  Submissions already exist — skipping demo papers.');
    return;
  }
  for (const p of PAPERS) {
    const fullText = `${p.abstract}\n\n${p.body}`;
    const { rows } = await query<{ id: string }>(
      `INSERT INTO submissions
         (student_id, title, abstract, author_name, matric_number, department, session, tags,
          status, full_text, index_status, published_at)
       VALUES ($1,$2,$3,'Demo Student','ENG/2020/1234',$4,$5,$6,'published',$7,'ready', now())
       RETURNING id`,
      [studentId, p.title, p.abstract, p.department, p.session, p.tags, fullText]
    );
    const vec = await embed(`${p.title}\n\n${fullText}`);
    await query(`UPDATE submissions SET embedding = $1 WHERE id = $2`, [vec, rows[0].id]);
    console.log(`   📄 seeded + embedded: ${p.title.slice(0, 50)}...`);
  }
  console.log(`✅ Seeded ${PAPERS.length} published papers.`);
}

async function main() {
  if (env.isProd) {
    throw new Error('Refusing to seed demo data in production. Use npm run bootstrap:admin instead.');
  }
  console.log('Seeding ARB ResearchHub...');
  await upsertAdmin();
  const studentId = await upsertStudent();
  await seedPapers(studentId);
  await pool.end();
  console.log('✅ Done.');
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
