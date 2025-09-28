"use client"

import type { ReactNode } from "react"
import { useState } from "react"

interface Column<T> {
  key: keyof T | string
  header: string
  render?: (item: T) => ReactNode
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  emptyMessage?: string
  itemsPerPage?: number
  showPagination?: boolean
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  emptyMessage = "ไม่มีข้อมูล",
  itemsPerPage = 10,
  showPagination = true,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.ceil(data.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = showPagination ? data.slice(startIndex, startIndex + itemsPerPage) : data

  /**
   * สร้างรายการหมายเลขหน้าที่จะแสดง โดยซ่อนตัวเลขตรงกลางด้วย '...'
   * และทำให้การแสดงผลมีความเสถียรเมื่อเลื่อนหน้า
   */
  const getPageNumbers = (totalPages: number, currentPage: number): (number | '...')[] => {
    // กำหนดค่าคงที่สำหรับการแสดงผล
    const MAX_VISIBLE_PAGES = 5; 
    const SIBLING_COUNT = 1; // จำนวนหน้าที่จะแสดงรอบหน้าปัจจุบัน (เช่น ...4, 5, 6...)
    const FIRST_LAST_COUNT = 2; // จำนวนหน้าแรกและหน้าสุดท้ายที่จะแสดง (เช่น 1, 2, ... N-1, N)

    if (totalPages <= MAX_VISIBLE_PAGES) {
      // ถ้าจำนวนหน้าน้อย ให้แสดงทั้งหมด
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const pages: (number | '...')[] = []
    
    // 1. ส่วนหน้า: [1, 2]
    for (let i = 1; i <= FIRST_LAST_COUNT; i++) {
        pages.push(i);
    }

    // คำนวณขอบเขตของชุดตัวเลขตรงกลาง
    let start = Math.max(FIRST_LAST_COUNT + 1, currentPage - SIBLING_COUNT);
    let end = Math.min(totalPages - FIRST_LAST_COUNT, currentPage + SIBLING_COUNT);

    // 2. ส่วนกลาง: เพิ่ม '...' ก่อน ถ้าจำเป็น
    if (start > FIRST_LAST_COUNT + 1) {
        pages.push('...');
    } else if (currentPage > FIRST_LAST_COUNT) {
        start = FIRST_LAST_COUNT + 1;
    }
    
    // เพิ่มหน้าปัจจุบันและหน้าที่อยู่รอบข้าง
    for (let i = start; i <= end; i++) {
        // ป้องกันการซ้ำซ้อนกับหน้าแรก
        if (i > FIRST_LAST_COUNT && i < totalPages - FIRST_LAST_COUNT + 1) {
            pages.push(i);
        }
    }
    
    // 3. ส่วนหลัง: เพิ่ม '...' หลัง ถ้าจำเป็น
    if (end < totalPages - FIRST_LAST_COUNT) {
      if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    } else if (currentPage <= totalPages - FIRST_LAST_COUNT) {
        end = totalPages - FIRST_LAST_COUNT;
    }

    // 4. ส่วนท้าย: [N-1, N]
    for (let i = totalPages - FIRST_LAST_COUNT + 1; i <= totalPages; i++) {
        // ป้องกันการซ้ำซ้อน
        if (i > (pages[pages.length - 1] as number)) {
            pages.push(i);
        } else if (i === totalPages && !pages.includes(i)) {
             pages.push(i);
        }
    }
    
    // กรอง '...' ซ้ำซ้อน
    return pages.filter((page, index) => !(page === '...' && pages[index - 1] === '...'))
  }

  const pagesToDisplay = getPageNumbers(totalPages, currentPage)

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
          <p className="text-gray-400 mt-2">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-8 text-center">
          <p className="text-gray-400">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-900">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {paginatedData.map((item, index) => (
              <tr key={index} className="hover:bg-gray-700 transition-colors">
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {column.render ? column.render(item) : item[column.key as keyof T]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* แก้ไข: ลบเงื่อนไข totalPages > 1 ออก เพื่อให้แสดง pagination เสมอหากมีข้อมูลและ showPagination เป็น true */}
      {showPagination && (
        <div className="px-4 py-3 flex items-center justify-between border-t border-gray-700 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-700 text-sm font-medium rounded-md text-gray-300 bg-gray-800 hover:bg-gray-700"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages} // เงื่อนไขนี้ยังคงถูกต้อง
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-700 text-sm font-medium rounded-md text-gray-300 bg-gray-800 hover:bg-gray-700"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-400">
                Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                <span className="font-medium">{Math.min(currentPage * itemsPerPage, data.length)}</span> of{" "}
                <span className="font-medium">{data.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-700 bg-gray-800 text-sm font-medium text-gray-300 hover:bg-gray-700"
                >
                  <span className="sr-only">Previous</span>
                  <svg
                    className="h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                {pagesToDisplay.map((page, index) => (
                  page === '...' ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-700 bg-gray-800 text-sm font-medium text-gray-300"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page as number)}
                      aria-current={currentPage === page ? "page" : undefined}
                      className={`${
                        currentPage === page
                          ? "z-10 bg-gray-700 border-green-500 text-green-500"
                          : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                      } relative inline-flex items-center px-4 py-2 border text-sm font-medium`}
                    >
                      {page}
                    </button>
                  )
                ))}
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages} // เงื่อนไขนี้ยังคงถูกต้อง
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-700 bg-gray-800 text-sm font-medium text-gray-300 hover:bg-gray-700"
                >
                  <span className="sr-only">Next</span>
                  <svg
                    className="h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}