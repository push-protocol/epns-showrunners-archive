import { Container } from 'typedi';
import config from '../config';

import db from '../helpers/dbHelper';

export default () => {
  return db.pool;
};
