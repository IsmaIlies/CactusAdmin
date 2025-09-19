import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import newsService, { NewsItem, uploadNewsPdf } from '../services/newsService';

const NouveautesPage: React.FC = () => {
  const { isAdmin, isDirection, isSuperviseur } = useAuth();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const unsub = newsService.listenNews(setItems);
    return () => unsub();
  }, []);

  const canUpload = isAdmin() || isDirection() || isSuperviseur();
  const canManage = canUpload; // same roles can delete

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file.type !== 'application/pdf') {
      alert('Veuillez sélectionner un fichier PDF.');
      return;
    }
    try {
      setUploading(true);
      await uploadNewsPdf(file, title);
      setTitle('');
      e.target.value = '';
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'envoi du PDF");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nouveautés</h1>
              <p className="text-gray-500">Documents d'information disponibles pour tous les agents.</p>
            </div>
          </div>

          {canUpload && (
            <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Ajouter un PDF</h2>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Titre (optionnel)</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Nouveaux scripts CANAL+ - Semaine 38"
                    className="w-full rounded-md border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className={`inline-flex items-center justify-center px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700 cursor-pointer ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
                    {uploading ? 'Envoi…' : 'Choisir un PDF'}
                    <input type="file" accept="application/pdf" onChange={handleUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 line-clamp-2">{item.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">{item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString('fr-FR') : ''}</p>
                    </div>
                    <span className="inline-flex items-center text-[10px] uppercase tracking-wide bg-green-50 text-green-700 px-2 py-1 rounded">PDF</span>
                  </div>
                </div>
                <div className="px-4 pb-4 flex gap-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex-1 flex-1 text-center px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50"
                  >
                    Télécharger
                  </a>
                  <button
                    onClick={() => setPreviewUrl(item.url)}
                    className="inline-flex-1 flex-1 text-center px-3 py-2 text-sm rounded-md bg-gray-900 text-white hover:bg-black"
                  >
                    Voir
                  </button>
                  {canManage && (
                    <button
                      onClick={async () => {
                        const ok = window.confirm('Supprimer ce document ? Cette action est irréversible.');
                        if (!ok) return;
                        try {
                          await newsService.deleteNewsItem(item);
                        } catch (e) {
                          console.error(e);
                          alert("Erreur lors de la suppression");
                        }
                      }}
                      className="inline-flex-1 px-3 py-2 text-sm rounded-md border border-red-200 text-red-700 hover:bg-red-50"
                      title="Supprimer"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {items.length === 0 && (
            <div className="text-center text-gray-500 py-20">Aucun document pour le moment.</div>
          )}
        </div>

        {previewUrl && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
            <div className="bg-white w-full max-w-5xl h-[80vh] rounded-lg overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-3 border-b">
                <h4 className="font-semibold">Aperçu du document</h4>
                <button onClick={() => setPreviewUrl(null)} className="px-3 py-1 rounded-md border hover:bg-gray-50">Fermer</button>
              </div>
              <div className="w-full h-full">
                <iframe title="aperçu pdf" src={previewUrl} className="w-full h-full" />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default NouveautesPage;
