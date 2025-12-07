/* eslint-disable @typescript-eslint/no-explicit-any */
import { Query } from 'mongoose';

type QueryOptions = Record<string, any>;

export default class QueryBuilder {
  private baseQuery: Query<any, any>;
  private originalQuery: QueryOptions;
  private meta: any = { page: 1, limit: 10, total: 0, pages: 0 };

  constructor(baseQuery: Query<any, any>, query: QueryOptions) {
    this.baseQuery = baseQuery;
    this.originalQuery = query || {};
  }

  search(fields: string[]) {
    const q = this.originalQuery.q;
    if (q) {
      const regex = new RegExp(q, 'i');
      const or = fields.map(f => ({ [f]: regex }));
      this.baseQuery = (this.baseQuery as any).find({ $or: or });
    }
    return this;
  }

  filter() {
  const qs = { ...this.originalQuery };
  const reserved = ['q','page','limit','sort','fields','minPrice','maxPrice'];
  reserved.forEach(r => delete qs[r]);

  const filterObj: any = {};

  Object.entries(qs).forEach(([key, value]) => {
    if (key.includes('[')) {
      const matches = key.match(/(.+)\[(.+)\]/);
      if (matches) {
        const field = matches[1]; const op = matches[2];
        const map: any = { gt: '$gt', gte: '$gte', lt: '$lt', lte: '$lte', ne: '$ne' };
        if (!filterObj[field]) filterObj[field] = {};
        filterObj[field][map[op]] = this.parseValue(value);
      }
    } else {
      filterObj[key] = this.parseValue(value);
    }
  });

  // ⭐ Add price filtering
  if (this.originalQuery.minPrice || this.originalQuery.maxPrice) {
    filterObj.price = {};
    if (this.originalQuery.minPrice) {
      filterObj.price.$gte = Number(this.originalQuery.minPrice);
    }
    if (this.originalQuery.maxPrice) {
      filterObj.price.$lte = Number(this.originalQuery.maxPrice);
    }
  }

  if (Object.keys(filterObj).length) {
    this.baseQuery = (this.baseQuery as any).find(filterObj);
  }

  return this;
}

  sort() {
    const sort = this.originalQuery.sort;
    if (sort) this.baseQuery = this.baseQuery.sort((sort as string).split(',').join(' '));
    else this.baseQuery = this.baseQuery.sort('-createdAt');
    return this;
  }

  fields() {
    const fields = this.originalQuery.fields;
    if (fields) this.baseQuery = this.baseQuery.select((fields as string).split(',').join(' '));
    else this.baseQuery = this.baseQuery.select('-__v');
    return this;
  }

  paginate() {
    const page = parseInt(this.originalQuery.page) || 1;
    const limit = parseInt(this.originalQuery.limit) || 10;
    const skip = (page - 1) * limit;
    this.meta.page = page; this.meta.limit = limit;
    this.baseQuery = this.baseQuery.skip(skip).limit(limit);
    return this;
  }

  async build() {
    return await this.baseQuery.exec();
  }

  async getMeta() {
    try {
 
      const model = (this.baseQuery as any).model;
      const filter = (this.baseQuery as any).getQuery ? (this.baseQuery as any).getQuery() : {};
      const total = model ? await model.countDocuments(filter) : 0;
      this.meta.total = total;
      this.meta.pages = Math.ceil(total / this.meta.limit);
    } catch (err) {
      this.meta.total = 0; this.meta.pages = 0;
    }
    return this.meta;
  }

  parseValue(val: any) {
    if (val === 'true') return true;
    if (val === 'false') return false;
    if (!isNaN(val) && val !== '') return Number(val);
    return val;
  }
}