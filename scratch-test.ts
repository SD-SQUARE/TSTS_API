import pg from "pg";
import jwt from "jsonwebtoken";

const { Client } = pg;
const client = new Client({
  host: "192.168.56.1",
  user: "postgres",
  password: "postgres",
  database: "tsts_db",
  port: 5432
});

async function run() {
  await client.connect();
  const resDb = await client.query('SELECT id, user_type as role, "firstName", "lastName" FROM users WHERE email = \'admin1@example.com\'');
  const user = resDb.rows[0];
  
  const payload = {
    id: user.id,
    role: user.role,
    name: { first: { en: user.firstName, ar: user.firstName }, mid: { en: "", ar: "" }, last: { en: user.lastName, ar: user.lastName } },
    email: "admin1@example.com"
  };

  const token = jwt.sign(payload, "example-secret", { expiresIn: "1h" });

  console.log("Token generated! Executing GET /tickets benchmark...");
  const start = performance.now();
  const res = await fetch("http://localhost:5050/api/v1/tickets?page_size=50", {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  const data = await res.json() as any;
  const end = performance.now();
  console.log(`Endpoint returned in ${(end - start).toFixed(2)}ms`);
  console.log(`Status: ${res.status}`);
  if (data.data) {
     console.log(`Returned count: ${data.data.length}`);
  } else {
     console.log(data);
  }
  process.exit(0);
}
run();
