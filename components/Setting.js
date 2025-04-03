import { Button, Form, Input, Radio, Space, Toast, Switch } from "antd-mobile"
import React, { useEffect } from "react"

import { useStorage } from "@plasmohq/storage/hook"

import styles from "./setting.module.css"

export function Setting() {
  const [form] = Form.useForm()
  // 使用 useStorage 获取和更新存储值
  const [data, setData] = useStorage("data", (storedValue) => storedValue || {})

  // 在data加载完成后设置表单值
  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      form.setFieldsValue(data)
    }
  }, [data, form])

  function onSubmit() {
    const values = form.getFieldsValue()
    setData(values)
    Toast.show({
      icon: "success",
      content: "保存成功"
    })
  }

  return (
    <div className={styles.setting}>
      <Form.Header>DeepSeek翻译设置</Form.Header>
      <Form
        form={form}
        layout="horizontal"
        // 不在这里设置initialValues，改为在useEffect中设置
        footer={
          <Button
            block
            type="submit"
            onClick={onSubmit}
            color="primary"
            size="small">
            保存配置
          </Button>
        }>
        <Form.Item
          name="enabled"
          label="开启翻译"
          initialValue={true}
          valuePropName="checked">
          <Switch />
        </Form.Item>
        
        <Form.Item
          name="apiUrl"
          label="API地址"
          initialValue="https://api.deepseek.com/v1/chat/completions"
          rules={[{ required: true, message: "请输入DeepSeek API地址" }]}>
          <Input placeholder="请输入DeepSeek API地址" />
        </Form.Item>
        <Form.Item
          name="apiKey"
          label="API密钥"
          rules={[{ required: true, message: "请输入DeepSeek API密钥" }]}>
          <Input placeholder="请输入DeepSeek API密钥" />
        </Form.Item>

        <Form.Item
          name="model"
          label="模型"
          initialValue="deepseek-chat"
          rules={[{ required: true, message: "请选择模型" }]}>
          <Radio.Group>
            <Space direction="vertical">
              <Radio value="deepseek-chat">DeepSeek-V3</Radio>
              <Radio value="deepseek-reasoner">DeepSeek-R1</Radio>
            </Space>
          </Radio.Group>
        </Form.Item>
      </Form>
    </div>
  )
}
