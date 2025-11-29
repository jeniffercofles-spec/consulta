import React from 'react';
import { DOCUMENTS_LIST } from '../knowledgeBase';
import { DocumentInfo } from '../types';

export const DocumentList: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
        Documentos Encontrados
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {DOCUMENTS_LIST.map((doc: DocumentInfo) => (
          <div 
            key={doc.id} 
            className="flex items-start p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors"
          >
            <span className="text-2xl mr-3">{doc.icon}</span>
            <div>
              <h4 className="text-sm font-medium text-gray-900">{doc.title}</h4>
              <p className="text-xs text-gray-500 mt-1">{doc.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};