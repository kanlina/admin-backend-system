import React from 'react';
import { Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { GlobalOutlined } from '@ant-design/icons';

const { Option } = Select;

const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (value: string) => {
    i18n.changeLanguage(value);
  };

  const languages = [
    { value: 'zh-CN', label: t('language.chinese'), flag: '🇨🇳' },
    { value: 'en-US', label: t('language.english'), flag: '🇺🇸' },
    { value: 'id-ID', label: t('language.indonesian'), flag: '🇮🇩' }
  ];

  return (
    <Select
      value={i18n.language}
      onChange={handleLanguageChange}
      style={{ width: 120 }}
      suffixIcon={<GlobalOutlined />}
      size="small"
    >
      {languages.map((lang) => (
        <Option key={lang.value} value={lang.value}>
          <span style={{ marginRight: 8 }}>{lang.flag}</span>
          {lang.label}
        </Option>
      ))}
    </Select>
  );
};

export default LanguageSwitcher;
