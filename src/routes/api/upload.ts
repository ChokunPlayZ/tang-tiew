import { createFileRoute } from '@tanstack/react-router'
import { writeFile, mkdir } from 'fs/promises'
import { randomUUID } from 'crypto'
import path from 'path'

export const Route = createFileRoute('/api/upload')({
    server: {
        handlers: {
            POST: async ({ request }) => {
                try {
                    const formData = await request.formData()
                    const file = formData.get('file') as File | null

                    if (!file) {
                        return Response.json({ error: 'No file provided' }, { status: 400 })
                    }

                    // Validate file type
                    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
                    if (!validTypes.includes(file.type)) {
                        return Response.json({ error: 'Invalid file type. Only images allowed.' }, { status: 400 })
                    }

                    // Max 5MB
                    if (file.size > 5 * 1024 * 1024) {
                        return Response.json({ error: 'File too large. Max 5MB.' }, { status: 400 })
                    }

                    // Create uploads directory if it doesn't exist
                    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
                    await mkdir(uploadsDir, { recursive: true })

                    // Generate unique filename
                    const ext = file.name.split('.').pop() || 'jpg'
                    const filename = `${randomUUID()}.${ext}`
                    const filepath = path.join(uploadsDir, filename)

                    // Save file
                    const buffer = Buffer.from(await file.arrayBuffer())
                    await writeFile(filepath, buffer)

                    // Return public URL
                    const url = `/uploads/${filename}`

                    return Response.json({ url })
                } catch (error) {
                    console.error('Upload error:', error)
                    return Response.json({ error: 'Failed to upload file' }, { status: 500 })
                }
            }
        }
    }
})
