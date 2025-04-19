import React, { useState, useEffect } from 'react';
import { auth, provider, db } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
  getDoc
} from 'firebase/firestore';

import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Paper,
  Avatar,
  ListItemAvatar,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FavoriteIcon from '@mui/icons-material/Favorite';

function App() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [replyMap, setReplyMap] = useState({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, 'allowedUsers', user.email);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          setUser(user); // 利用OK
        } else {
          alert('このアカウントでは掲示板を利用できません');
          await signOut(auth); // 利用不可→ログアウト
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allMessages = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const replies = {};
      allMessages.forEach((msg) => {
        if (msg.parentId) {
          if (!replies[msg.parentId]) replies[msg.parentId] = [];
          replies[msg.parentId].push(msg);
        }
      });
      setReplyMap(replies);
      setMessages(allMessages.filter((msg) => !msg.parentId));
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e, parentId = null) => {
    e.preventDefault();
    if (!text.trim()) return;
    await addDoc(collection(db, 'messages'), {
      text,
      userName: user.displayName,
      userPhoto: user.photoURL,
      createdAt: serverTimestamp(),
      likes: 0,
      isDeleted: false,
      parentId,
    });
    setText('');
  };

  const handleDelete = async (id) => {
    if (window.confirm('この投稿を削除しますか？')) {
      await updateDoc(doc(db, 'messages', id), {
        isDeleted: true,
      });
    }
  };

  const handleLike = async (id, currentLikes) => {
    const docRef = doc(db, 'messages', id);
    await updateDoc(docRef, {
      likes: currentLikes + 1,
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp.toDate()).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderReplies = (parentId) => {
    const replies = replyMap[parentId] || [];
    return replies.map((msg) => (
      !msg.isDeleted && (
        <Paper key={msg.id} sx={{ ml: 4, my: 1, p: 2, bgcolor: '#f5f5f5' }}>
          <ListItem alignItems="flex-start">
            <ListItemAvatar>
              <Avatar src={msg.userPhoto} alt={msg.userName} />
            </ListItemAvatar>
            <ListItemText
              primary={
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="subtitle2" fontWeight="bold">
                    {msg.userName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(msg.createdAt)}
                  </Typography>
                </Box>
              }
              secondary={
                <>
                  <Typography variant="body2" sx={{ mb: 1 }}>{msg.text}</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <IconButton onClick={() => handleLike(msg.id, msg.likes || 0)} color="error" size="small">
                      <FavoriteIcon fontSize="small" />
                    </IconButton>
                    <Typography variant="body2">{msg.likes || 0}</Typography>
                  </Box>
                </>
              }
            />
          </ListItem>
        </Paper>
      )
    ));
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4, mb: 2 }}>
        <Typography variant="h4" gutterBottom>Rakusen Talk Board</Typography>
        {user ? (
          <>
            <Typography variant="subtitle1">ログイン中：{user.displayName}</Typography>
            <Button variant="outlined" onClick={() => signOut(auth)} sx={{ mt: 1 }}>ログアウト</Button>
            <Box component="form" onSubmit={(e) => handleSubmit(e)} sx={{ mt: 3, display: 'flex', gap: 1 }}>
              <TextField fullWidth label="メッセージを入力" variant="outlined" value={text} onChange={(e) => setText(e.target.value)} />
              <Button type="submit" variant="contained">投稿</Button>
            </Box>
          </>
        ) : (
          <Button variant="contained" onClick={() => signInWithPopup(auth, provider)}>Googleでログイン</Button>
        )}
      </Box>

      <List>
        {messages.map((msg) => (
          !msg.isDeleted && (
            <Paper key={msg.id} sx={{ mb: 2, p: 2 }}>
              <ListItem
                alignItems="flex-start"
                secondaryAction={
                  user?.displayName === msg.userName && (
                    <IconButton edge="end" onClick={() => handleDelete(msg.id)}>
                      <DeleteIcon />
                    </IconButton>
                  )
                }
              >
                <ListItemAvatar>
                  <Avatar src={msg.userPhoto} alt={msg.userName} />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2" fontWeight="bold">
                        {msg.userName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(msg.createdAt)}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body1" sx={{ mb: 1 }}>{msg.text}</Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <IconButton onClick={() => handleLike(msg.id, msg.likes || 0)} color="error" size="small">
                          <FavoriteIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="body2">{msg.likes || 0}</Typography>
                      </Box>
                      <Box component="form" onSubmit={(e) => handleSubmit(e, msg.id)} sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        <TextField fullWidth size="small" label="返信を入力" variant="outlined" value={text} onChange={(e) => setText(e.target.value)} />
                        <Button type="submit" variant="outlined">返信</Button>
                      </Box>
                    </>
                  }
                />
              </ListItem>
              {renderReplies(msg.id)}
            </Paper>
          )
        ))}
      </List>
    </Container>
  );
}

export default App;