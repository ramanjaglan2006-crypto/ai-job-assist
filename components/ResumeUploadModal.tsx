'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { ParsedResume } from '@/lib/types'
import { toast } from 'react-hot-toast'

interface Props {
  sessionId: string
  onClose: () => void
  onUploaded: (resume: ParsedResume) => void
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

export default function ResumeUploadModal({ sessionId, onClose, onUploaded }: Props) {
  const [state, setState] = useState<UploadState>('idle')
  const [error, setError] = useState<string>('')
  const [progress, setProgress] = useState(0)

  const upload = async (file: File) => {
    setState('uploading')
    setError('')
    setProgress(10)

    const formData = new FormData()
    formData.append('resume', file)
    formData.append('sessionId', sessionId)

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + 15, 85))
    }, 400)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      clearInterval(progressInterval)
      setProgress(100)

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Upload failed')
      }

      const data = await res.json()
      setState('success')
      toast.success('Resume parsed successfully!')
      setTimeout(() => onUploaded(data.resume), 800)
    } catch (err: any) {
      clearInterval(progressInterval)
      setError(err.message || 'Failed to process resume')
      setState('error')
      toast.error('Upload failed')
    }
  }

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      setError('Invalid file type or size. Please upload PDF or DOCX (max 10MB).')
      setState('error')
      return
    }
    if (acceptedFiles.length > 0) upload(acceptedFiles[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    disabled: state === 'uploading',
  })

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Upload Resume</h2>
            <p className="text-xs text-slate-500 mt-0.5">PDF or DOCX · Max 10MB</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* Drop Zone */}
        {state !== 'success' && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragActive
                ? 'border-indigo-400 bg-indigo-50'
                : state === 'error'
                ? 'border-red-300 bg-red-50'
                : 'border-slate-300 hover:border-indigo-300 hover:bg-slate-50'
            } ${state === 'uploading' ? 'pointer-events-none opacity-70' : ''}`}
          >
            <input {...getInputProps()} />
            {state === 'uploading' ? (
              <div className="space-y-3">
                <Loader2 size={36} className="mx-auto text-indigo-500 animate-spin" />
                <p className="text-sm font-medium text-slate-700">Parsing your resume...</p>
                <div className="bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400">{progress}% complete</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload size={36} className={`mx-auto ${state === 'error' ? 'text-red-400' : 'text-indigo-400'}`} />
                <p className="text-sm font-medium text-slate-700">
                  {isDragActive ? 'Drop your resume here' : 'Drag & drop or click to upload'}
                </p>
                <p className="text-xs text-slate-400">Supports PDF and DOCX</p>
              </div>
            )}
          </div>
        )}

        {/* Success */}
        {state === 'success' && (
          <div className="text-center py-8 space-y-2">
            <CheckCircle size={48} className="mx-auto text-green-500" />
            <p className="font-semibold text-slate-900">Resume parsed!</p>
            <p className="text-xs text-slate-500">Generating your profile...</p>
          </div>
        )}

        {/* Error */}
        {state === 'error' && error && (
          <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Tips */}
        <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg p-3">
          <p className="text-xs text-blue-700 font-medium mb-1">💡 Tips for best results:</p>
          <ul className="text-xs text-blue-600 space-y-0.5">
            <li>• Use a text-based PDF (not scanned image)</li>
            <li>• Include skills, experience, and education sections</li>
            <li>• Your resume stays in this session only</li>
          </ul>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          🔒 Resume is processed locally and not stored permanently
        </p>
      </div>
    </div>
  )
}
