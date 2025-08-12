import axios from "axios";

const J0 = axios.create({
  baseURL: process.env.JUDGE0_URL,
  headers: {
    "Content-Type": "application/json",
    "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
    "X-RapidAPI-Key": process.env.JUDGE0_KEY
  }
});

// Wait=true (sync) helper
export async function runSingle({ source_code, language_id, stdin, expected_output }) {
  const { data } = await J0.post(
    `/submissions?base64_encoded=false&wait=true`,
    { source_code, language_id, stdin, expected_output }
  );
  return data;
}
