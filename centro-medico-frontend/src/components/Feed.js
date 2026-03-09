import React, { useEffect, useState } from 'react';
import { getFeed } from '../api';
import { MessageSquare, Heart, Share2 } from 'lucide-react';

export default function Feed({ locationId }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadFeed();
    }, [locationId]);

    const loadFeed = async () => {
        try {
            setLoading(true);
            const data = await getFeed();
            setPosts(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getCategoryColor = (cat) => {
        switch (cat) {
            case 'Científico': return 'bg-purple-100 text-purple-800';
            case 'Aviso': return 'bg-yellow-100 text-yellow-800';
            case 'Cumpleaños': return 'bg-pink-100 text-pink-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando novedades...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            {posts.map((post) => (
                <div key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(post.category)}`}>
                                {post.category}
                            </span>
                            <span className="text-gray-400 text-xs">
                                {new Date(post.created_at).toLocaleDateString()}
                            </span>
                        </div>

                        <p className="text-gray-800 leading-relaxed mb-4">
                            {post.content}
                        </p>

                        {post.image_url && (
                            <img src={post.image_url} alt="Post content" className="w-full h-64 object-cover rounded-lg mb-4" />
                        )}

                        <div className="flex items-center space-x-6 text-gray-500 pt-4 border-t border-gray-50">
                            <button className="flex items-center space-x-2 hover:text-red-500 transition-colors">
                                <Heart size={18} />
                                <span className="text-sm">Me gusta</span>
                            </button>
                            <button className="flex items-center space-x-2 hover:text-blue-500 transition-colors">
                                <MessageSquare size={18} />
                                <span className="text-sm">Comentar</span>
                            </button>
                            <button className="flex items-center space-x-2 hover:text-green-500 transition-colors">
                                <Share2 size={18} />
                                <span className="text-sm">Compartir</span>
                            </button>
                        </div>
                    </div>
                </div>
            ))}

            {posts.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl">
                    <p className="text-gray-500">No hay publicaciones recientes en tu zona.</p>
                </div>
            )}
        </div>
    );
}
