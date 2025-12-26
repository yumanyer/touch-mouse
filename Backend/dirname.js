import path from "path";
import { fileURLToPath } from "url";

const getDirname = () => {
  const __filename = fileURLToPath(import.meta.url);
  return path.dirname(__filename);
};

export default getDirname;