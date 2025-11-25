import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, message } from 'antd';
import { apiService } from '../services/api';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

const NewsPreview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [previewHtml, setPreviewHtml] = useState<string>('');

  useEffect(() => {
    if (id) {
      loadContent();
    }
  }, [id]);

  const loadContent = async () => {
    try {
      setLoading(true);
      const response = await apiService.getContentById(id!);
      if (response.success) {
        const data = response.data;
        const html = generatePreviewHTML(
          data.title || '',
          data.content || '',
          data.titleImg01 || '',
          data.author || '',
          data.publishedAt || ''
        );
        setPreviewHtml(html);
      } else {
        message.error('加载内容失败');
        navigate('/news');
      }
    } catch (error) {
      message.error('加载内容失败');
      navigate('/news');
    } finally {
      setLoading(false);
    }
  };

  // 转义HTML特殊字符
  const escapeHtml = (text: string): string => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  };

  // 生成预览HTML，使用提供的模板
  const generatePreviewHTML = (title: string, content: string, image: string, author: string, publishedAt: string): string => {
    // 提取content中的图片（如果有）
    let contentImage = image;
    if (!contentImage && content) {
      const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
      if (imgMatch) {
        contentImage = imgMatch[1];
      }
    }

    // 清理content，移除图片标签（因为会在模板中单独显示）
    let cleanContent = content || '';
    if (cleanContent) {
      cleanContent = cleanContent.replace(/<img[^>]*>/gi, '');
    }

    // 格式化日期
    const date = publishedAt ? dayjs(publishedAt).locale('id').format('DD MMMM YYYY') : '';

    // 转义标题和作者
    const escapedTitle = escapeHtml(title || '');
    const escapedAuthor = escapeHtml(author || '');
    const escapedDate = escapeHtml(date || '');
    const escapedImage = escapeHtml(contentImage || '');

    return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta content="width=device-width, initial-scale=1.0" name="viewport">
    <title>${escapedTitle}</title>
    <meta name="description" content="">
    <meta name="keywords" content="">
    <meta http-equiv="Content-Security-Policy" content="script-src 'self' 'unsafe-inline' cdn.jsdelivr.net blob: filesystem:">
    <link href="https://fonts.googleapis.com" rel="preconnect">
    <link href="https://fonts.gstatic.com" rel="preconnect" crossorigin>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
        }
        .content-news {
            padding-top: 120px;
            padding-bottom: 40px;
            min-height: 60vh;
        }
        .content-container {
            max-width: 700px;
        }
        .btn-back {
            background: #fff;
            border: 1px solid #ddd;
            color: #333;
            transition: all 0.3s;
        }
        .btn-back:hover {
            background: #f8f9fa;
            border-color: #0062cc;
            color: #0062cc;
        }
        .content-title {
            font-size: 1.75rem;
            font-weight: 600;
            color: #1a1a1a;
            line-height: 1.4;
        }
        .content-image {
            width: 100%;
            height: auto;
            border-radius: 8px;
            margin-bottom: 1.5rem;
        }
        .content-text {
            font-size: 1rem;
            line-height: 1.8;
            color: #444;
        }
        .content-text p {
            margin-bottom: 1rem;
        }
        .content-text ol, .content-text ul {
            margin-bottom: 1rem;
            padding-left: 2rem;
        }
        .content-text li {
            margin-bottom: 0.5rem;
        }
        .text-muted {
            color: #6c757d;
            font-size: 0.9rem;
        }
        .author::after {
            content: " • ";
            margin: 0 0.5rem;
        }
    </style>
</head>
<body>
    <main class="main">
        <section id="content-news" class="content-news d-flex align-items-center justify-content-center">
            <div class="container content-container">
                <!-- Back Button -->
                <div class="mb-4 d-flex justify-content-start">
                    <button onclick="window.history.back()" 
                        class="btn btn-back btn-lg rounded-circle shadow-sm d-inline-flex align-items-center justify-content-center"
                        style="width:48px;height:48px;">
                        <i class="bi bi-arrow-left" style="font-size:1.5rem;"></i>
                    </button>
                </div>

                <!-- Title and Meta Information -->
                <h1 class="content-title mb-3 text-center">${escapedTitle}</h1>
                <div class="text-muted mb-4 text-center">
                    ${escapedAuthor ? `<span class="author">${escapedAuthor}</span>` : ''}
                    ${escapedDate ? `<span class="date">${escapedDate}</span>` : ''}
                </div>

                <!-- Image and Content -->
                <div class="row justify-content-center">
                    <div class="col-12">
                        ${escapedImage ? `<img src="${escapedImage}" class="img-fluid rounded content-image mb-4 mx-auto d-block" alt="${escapedTitle}">` : ''}
                    </div>
                    <div class="col-12">
                        <div class="content-text">
                            ${cleanContent}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </main>
</body>
</html>`;
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <iframe
      srcDoc={previewHtml}
      style={{
        width: '100%',
        height: '100vh',
        border: 'none',
      }}
      title="News Preview"
    />
  );
};

export default NewsPreview;

