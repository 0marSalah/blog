export interface Blog {
  id: string
  type: 'Blog'

  name: string
  description?: string

  author: string // DID

  createdAt: string
  updatedAt: string
}

export interface BlogPost {
  id: string
  type: 'BlogPost'

  blogId: string
  author: string // DID

  title: string
  description?: string

  content: string
  contentType: 'text/markdown'

  url: string

  publishedAt: string
  updatedAt: string

  assets?: AssetRef[]
}

export interface AssetRef {
  id: string
  url: string

  mediaType: string
  byteLength: number

  digest: string
}
