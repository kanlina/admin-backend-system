import { createId998DbConnection } from '../utils/database';

export interface Content {
  id?: number;
  appId: number;
  parentId?: number;
  type: number; // 1=分类, 2=文章
  title: string;
  subtitle?: string;
  author?: string;
  content?: string;
  alias?: string;
  urlPath?: string;
  titleImg01?: string;
  enabled: number; // 0=禁用, 1=启用
  publishedAt?: string;
  sortNum?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContentQuery {
  page?: number;
  pageSize?: number;
  title?: string;
  enabled?: number;
  appId?: number;
  type?: number;
  parentId?: number;
}

export const contentService = {
  // 获取内容列表（分页）
  async getContents(query: ContentQuery = {}) {
    const connection = await createId998DbConnection();
    try {
      const page = query.page || 1;
      const pageSize = query.pageSize || 10;
      const offset = (page - 1) * pageSize;

      let whereConditions: string[] = [];
      let params: any[] = [];

      if (query.appId) {
        whereConditions.push('appId = ?');
        params.push(query.appId);
      }

      if (query.title) {
        whereConditions.push('title LIKE ?');
        params.push(`%${query.title}%`);
      }

      if (query.enabled !== undefined) {
        whereConditions.push('enabled = ?');
        params.push(query.enabled);
      }

      if (query.type !== undefined) {
        whereConditions.push('type = ?');
        params.push(query.type);
      }

      if (query.parentId !== undefined) {
        whereConditions.push('parentId = ?');
        params.push(query.parentId);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // 查询总数
      const [countRows] = await connection.execute(
        `SELECT COUNT(*) as total FROM content ${whereClause}`,
        params
      );
      const total = (countRows as any[])[0].total;

      // 查询数据
      const [rows] = await connection.execute(
        `SELECT id, publishedAt, title, titleImg01, enabled, urlPath, type, parentId, alias, subtitle, author 
         FROM content ${whereClause} 
         ORDER BY id DESC 
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );

      return {
        data: rows as Content[],
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      };
    } finally {
      await connection.end();
    }
  },

  // 获取单个内容详情
  async getContentById(id: number) {
    const connection = await createId998DbConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM content WHERE id = ?',
        [id]
      );
      const contents = rows as Content[];
      return contents.length > 0 ? contents[0] : null;
    } finally {
      await connection.end();
    }
  },

  // 创建内容
  async createContent(content: Partial<Content>) {
    const connection = await createId998DbConnection();
    try {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      
      // 检查别名是否已存在
      if (content.alias && content.appId) {
        const [existing] = await connection.execute(
          'SELECT id FROM content WHERE appId = ? AND alias = ?',
          [content.appId, content.alias]
        );
        if ((existing as any[]).length > 0) {
          throw new Error('别名已经存在');
        }
      }

      const [result] = await connection.execute(
        `INSERT INTO content (appId, parentId, type, title, subtitle, author, content, alias, titleImg01, enabled)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          content.appId || 15, // 默认 appId
          content.parentId || 10, // 默认 parentId
          content.type || 2, // 默认文章类型
          content.title || '',
          content.subtitle || '',
          content.author || '',
          content.content || '',
          content.alias || '',
          content.titleImg01 || '',
          content.enabled !== undefined ? content.enabled : 1
        ]
      );

      const insertId = (result as any).insertId;

      // 更新 urlPath 和 sortNum
      const urlPath = `/article/${insertId}.html`;
      await connection.execute(
        'UPDATE content SET urlPath = ?, sortNum = ? WHERE id = ?',
        [urlPath, insertId, insertId]
      );

      return await this.getContentById(insertId);
    } finally {
      await connection.end();
    }
  },

  // 更新内容
  async updateContent(id: number, content: Partial<Content>) {
    const connection = await createId998DbConnection();
    try {
      // 检查别名是否已存在
      if (content.alias && content.appId) {
        const [existing] = await connection.execute(
          'SELECT id FROM content WHERE appId = ? AND alias = ? AND id != ?',
          [content.appId, content.alias, id]
        );
        if ((existing as any[]).length > 0) {
          throw new Error('别名已经存在');
        }
      }

      // 检查父类不能是自己
      if (content.type === 1 && content.parentId === id) {
        throw new Error('父类不能是自己');
      }

      const updateFields: string[] = [];
      const updateValues: any[] = [];

      const allowedFields = ['title', 'subtitle', 'author', 'content', 'alias', 'titleImg01', 'enabled', 'type', 'parentId'];
      allowedFields.forEach(field => {
        if (content[field as keyof Content] !== undefined) {
          updateFields.push(`${field} = ?`);
          updateValues.push(content[field as keyof Content]);
        }
      });

      if (updateFields.length === 0) {
        return await this.getContentById(id);
      }

      updateValues.push(id);

      await connection.execute(
        `UPDATE content SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      return await this.getContentById(id);
    } finally {
      await connection.end();
    }
  },

  // 删除内容
  async deleteContent(id: number) {
    const connection = await createId998DbConnection();
    try {
      // 检查是否是系统内容
      const content = await this.getContentById(id);
      if (content && content.alias && content.alias.startsWith('app_setting_')) {
        throw new Error('系统内容不能删除');
      }

      await connection.execute('DELETE FROM content WHERE id = ?', [id]);
      return true;
    } finally {
      await connection.end();
    }
  },

  // 批量删除
  async deleteContents(ids: number[]) {
    const connection = await createId998DbConnection();
    try {
      for (const id of ids) {
        await this.deleteContent(id);
      }
      return true;
    } finally {
      await connection.end();
    }
  },

  // 获取分类树
  async getCategories(appId: number) {
    const connection = await createId998DbConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT id, title as name, parentId FROM content WHERE type = 1 AND appId = ? ORDER BY sortNum ASC',
        [appId]
      );
      return rows as Array<{ id: number; name: string; parentId: number }>;
    } finally {
      await connection.end();
    }
  },

  // 更新内容详情（保存富文本内容）
  async updateContentDetail(id: number, contentHtml: string) {
    const connection = await createId998DbConnection();
    try {
      // 替换样式类为内联样式
      let processedContent = contentHtml;
      const replacements = [
        ['class="ql-align-center"', 'style="text-align:center"'],
        ['class="ql-align-right"', 'style="text-align:right"'],
        ['class="ql-align-justify"', 'style="text-align:justify"']
      ];
      
      replacements.forEach(([search, replace]) => {
        processedContent = processedContent.replace(new RegExp(search, 'g'), replace);
      });

      // 添加 H5 默认头部
      const h5Default = `<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <style>
	  h1 {
		  text-align: center;
	  }
	  img {
		  width: 100%;
		  height: auto;
	  }
  </style>
</head>`;

      const fullContent = h5Default + processedContent;

      // 处理图片样式
      const finalContent = fullContent.replace(
        /<img /g,
        "<img style='margin:0 auto;display:block;width:100%' "
      );

      await connection.execute(
        'UPDATE content SET content = ? WHERE id = ?',
        [finalContent, id]
      );

      return await this.getContentById(id);
    } finally {
      await connection.end();
    }
  },

  // 切换启用状态
  async toggleEnabled(id: number, enabled: number) {
    const connection = await createId998DbConnection();
    try {
      await connection.execute(
        'UPDATE content SET enabled = ? WHERE id = ?',
        [enabled, id]
      );
      return await this.getContentById(id);
    } finally {
      await connection.end();
    }
  }
};

