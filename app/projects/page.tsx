'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useProjectStore } from '@/lib/stores/useProjectStore';
import { Project, ProjectStatus } from '@/lib/types';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  ArrowRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  X,
} from 'lucide-react';

const STATUS_CONFIG: Record<ProjectStatus, { label: string; badge: string; icon: React.ComponentType<{ className?: string }> }> = {
  planning: {
    label: 'Đang lập kế hoạch',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Clock,
  },
  in_production: {
    label: 'Đang sản xuất',
    badge: 'bg-amber-50 text-amber-800 border-amber-300 font-bold',
    icon: Layers,
  },
  completed: {
    label: 'Đã hoàn thành',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  },
};

export default function ProjectsPage() {
  const [mounted, setMounted] = useState(false);
  const projects = useProjectStore((s) => s.projects);
  const projectItems = useProjectStore((s) => s.projectItems);
  const getProjectProducts = useProjectStore((s) => s.getProjectProducts);
  const addProject = useProjectStore((s) => s.addProject);
  const updateProject = useProjectStore((s) => s.updateProject);
  const updateProjectStatus = useProjectStore((s) => s.updateProjectStatus);
  const deleteProject = useProjectStore((s) => s.deleteProject);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [formData, setFormData] = useState<{
    project_code: string;
    name: string;
    client_name: string;
    deadline: string;
    status: ProjectStatus;
  }>({
    project_code: '',
    name: '',
    client_name: '',
    deadline: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    status: 'planning',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="p-8 text-center text-slate-500">
        Đang tải danh sách công trình...
      </div>
    );
  }

  const handleOpenAdd = () => {
    setEditingProject(null);
    setFormData({
      project_code: `DA-${Date.now().toString().slice(-4)}`,
      name: '',
      client_name: '',
      deadline: new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10),
      status: 'planning',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Project) => {
    setEditingProject(p);
    setFormData({
      project_code: p.project_code,
      name: p.name,
      client_name: p.client_name,
      deadline: p.deadline,
      status: p.status,
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_code.trim() || !formData.name.trim()) {
      alert('Vui lòng nhập mã và tên công trình');
      return;
    }

    if (editingProject) {
      if (formData.status === 'completed' && editingProject.status !== 'completed') {
        updateProjectStatus(editingProject.id, 'completed');
        updateProject(editingProject.id, {
          project_code: formData.project_code,
          name: formData.name,
          client_name: formData.client_name,
          deadline: formData.deadline,
        });
      } else {
        updateProject(editingProject.id, formData);
      }
    } else {
      addProject(formData);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Bạn có chắc muốn xóa công trình "${name}" cùng toàn bộ khối lượng sản phẩm đã nhập?`)) {
      deleteProject(id);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Quản lý Công trình & Dự án Sản xuất</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Nhập khối lượng thành phẩm theo từng công trình để bóc tách vật tư và lập kế hoạch sản xuất
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs rounded-lg shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Công Trình Mới</span>
        </button>
      </div>

      {/* Grid danh sách công trình */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((project) => {
          const prods = getProjectProducts(project.id);
          const legacyItems = projectItems.filter((it) => it.project_id === project.id);
          const typesCount = prods.length > 0 ? prods.length : legacyItems.length;
          const totalProductsQty = prods.length > 0
            ? prods.reduce((acc, p) => acc + (p.quantity || 0), 0)
            : legacyItems.reduce((acc, it) => acc + it.quantity, 0);

          const statusInfo = STATUS_CONFIG[project.status];
          const StatusIcon = statusInfo.icon;
          const isEmpty = typesCount === 0 || totalProductsQty === 0;

          return (
            <div
              key={project.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      {project.project_code}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full border ${statusInfo.badge}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      <span>{statusInfo.label}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(project)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded"
                      title="Sửa thông tin công trình"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(project.id, project.name)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded"
                      title="Xóa công trình"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 text-base mt-2.5">
                  {project.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Khách hàng: <strong className="text-slate-700">{project.client_name || 'Khách vãng lai'}</strong>
                </p>

                <div className="flex items-center gap-4 mt-3 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Hạn giao: <strong>{new Date(project.deadline).toLocaleDateString('vi-VN')}</strong></span>
                  </div>
                  <div>
                    Sản phẩm: <strong>{typesCount}</strong> loại (Tổng <strong>{totalProductsQty}</strong> cái)
                  </div>
                </div>

                {isEmpty && (
                  <div className="mt-3 p-2 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Công trình này chưa nhập số lượng sản phẩm</span>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  ID: {project.id}
                </span>

                <Link
                  href={`/projects/${project.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs"
                >
                  <span>Nhập Sản Phẩm & Bóc Tách</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Thêm/Sửa Công trình */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-base">
                {editingProject ? 'Cập nhật Công trình' : 'Tạo Công trình mới'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mã công trình *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.project_code}
                    onChange={(e) => setFormData({ ...formData, project_code: e.target.value.toUpperCase() })}
                    placeholder="VD: DA-TB-01"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Trạng thái
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                  >
                    <option value="planning">Đang lập kế hoạch</option>
                    <option value="in_production">Đang sản xuất</option>
                    <option value="completed">Đã hoàn thành</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên công trình / Đơn hàng *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: A – Văn phòng Tân Bình"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên khách hàng / Chủ đầu tư
                </label>
                <input
                  type="text"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="VD: Công ty TNHH Tân Bình Tech"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hạn chót bàn giao (Deadline)
                </label>
                <input
                  type="date"
                  required
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm transition-colors"
                >
                  {editingProject ? 'Lưu Thay Đổi' : 'Tạo Công Trình'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
