import { useRef, useState } from 'react';
import { store, useData } from '@/lib/store';
import type { Document } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { resizeImage, isImageFile } from '@/lib/images';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/Misc';
import { useToast } from '@/components/ui/Toast';
import { useCan } from '@/lib/roles';

/**
 * Galerie photos d'un chantier (avancement des travaux, réceptions).
 * Les photos sont stockées comme documents de catégorie PHOTO rattachés au
 * chantier (image redimensionnée/compressée en mode démo).
 */
export function PhotoGallery({ chantierId, clientId }: { chantierId: string; clientId?: string }) {
  const data = useData();
  const toast = useToast();
  const can = useCan();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState<Document | null>(null);

  const photos = data.documents
    .filter((d) => d.chantierId === chantierId && d.categorie === 'PHOTO')
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));

  const onFiles = async (files: FileList) => {
    const imgs = [...files].filter(isImageFile);
    if (imgs.length === 0) {
      toast('Aucune image valide sélectionnée.', 'danger');
      return;
    }
    setBusy(true);
    let ok = 0;
    try {
      for (const f of imgs) {
        try {
          const r = await resizeImage(f);
          store.create('documents', {
            titre: f.name.replace(/\.[^.]+$/, ''),
            categorie: 'PHOTO',
            type: 'jpg',
            dataUrl: r.dataUrl,
            taille: r.size,
            chantierId,
            clientId,
            notes: '',
          });
          ok++;
        } catch {
          /* ignore l'image en échec */
        }
      }
      toast(`${ok} photo(s) ajoutée(s).`, 'success');
    } finally {
      setBusy(false);
    }
  };

  const setCaption = (d: Document, caption: string) => store.update('documents', d.id, { notes: caption });
  const del = (d: Document) => {
    if (!confirm('Supprimer cette photo ?')) return;
    store.remove('documents', d.id);
    if (lightbox?.id === d.id) setLightbox(null);
    toast('Photo supprimée.', 'danger');
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <p className="cell-sub" style={{ margin: 0 }}>
          <Icon name="pin" size={13} /> {photos.length} photo(s) — avancement, réceptions, réserves.
        </p>
        <button className="btn btn--primary btn--sm" onClick={() => fileRef.current?.click()} disabled={busy}>
          <Icon name="plus" size={14} /> {busy ? 'Import…' : 'Ajouter des photos'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files?.length) onFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {photos.length === 0 ? (
        <EmptyState icon="folder" title="Aucune photo" text="Ajoutez des photos de chantier (avancement, réceptions)." />
      ) : (
        <div className="photo-grid">
          {photos.map((p) => (
            <div key={p.id} className="photo-card">
              <div className="photo-thumb" onClick={() => setLightbox(p)} title="Agrandir">
                {p.dataUrl ? <img src={p.dataUrl} alt={p.titre} loading="lazy" /> : <div className="photo-noimg"><Icon name="document" size={22} /></div>}
                <span className="photo-date">{formatDate(p.createdAt)}</span>
              </div>
              <div className="photo-meta">
                <input
                  className="photo-caption"
                  defaultValue={p.notes ?? ''}
                  placeholder="Légende…"
                  onBlur={(e) => setCaption(p, e.target.value)}
                />
                {can.canDelete && (
                  <button className="icon-btn danger" onClick={() => del(p)} aria-label="Supprimer">
                    <Icon name="trash" size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" aria-label="Fermer"><Icon name="close" size={22} /></button>
          <img src={lightbox.dataUrl} alt={lightbox.titre} onClick={(e) => e.stopPropagation()} />
          {lightbox.notes && <div className="lightbox-caption">{lightbox.notes}</div>}
        </div>
      )}
    </div>
  );
}
