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
  Tabs,
  Tab,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  Menu,
  Stack
} from '@mui/material';
import { Close, Delete as DeleteIcon, Favorite as FavoriteIcon, Menu as MenuIcon } from '@mui/icons-material';


function App() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [ward, setWard] = useState('1st');
  const [selectedWard, setSelectedWard] = useState('1st');
  const [replyMap, setReplyMap] = useState({});
  const [openGuide, setOpenGuide] = useState(false);
  const [replyTextMap, setReplyTextMap] = useState({});
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);
  const handleMenuClick = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);  
  const handleReplyChange = (id, value) => {
    setReplyTextMap((prev) => ({ ...prev, [id]: value }));
  };
  
  const getReplyText = (id) => replyTextMap[id] || '';
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, 'allowedUsers', user.email);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          setUser(user);
        } else {
          alert('このアカウントでは掲示板を利用できません');
          await signOut(auth);
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
    if (!text.trim() && !parentId) return;
  
    await addDoc(collection(db, 'messages'), {
      text: parentId ? getReplyText(parentId) : text,
      title: parentId ? '' : title,
      userName: user.displayName,
      userPhoto: user.photoURL,
      createdAt: serverTimestamp(),
      likes: 0,
      isDeleted: false,
      parentId,
      ward: parentId ? '' : ward,
    });
  
    if (parentId) {
      setReplyTextMap((prev) => ({ ...prev, [parentId]: '' }));
    } else {
      setText('');
      setTitle('');
    }
  
    if (!parentId) {
      setSelectedWard(ward);
    }
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
                <Box>
                  {msg.title && (
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      {msg.title}
                    </Typography>
                  )}
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="subtitle2" fontWeight="bold">
                      {msg.userName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(msg.createdAt)}
                    </Typography>
                  </Box>
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
        <Tabs value={selectedWard} onChange={(e, newValue) => setSelectedWard(newValue)} centered>
          <Tab label="第一病棟" value="1st" />
          <Tab label="第二病棟" value="2nd" />
          <Tab label="その他" value="other" />
        </Tabs>
        {user ? (
          <>
            <IconButton
              onClick={handleMenuClick}
              sx={{ position: 'fixed', top: 16, right: 16, zIndex: 9999 }}
            >
              <MenuIcon />
            </IconButton>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ position: 'fixed', top: 16, right: 16, zIndex: 9999 }}>
              <Avatar
                src={user?.photoURL}
                alt={user?.displayName}
                sx={{ width: 32, height: 32 }}
              />
              <IconButton onClick={handleMenuClick}>
                <MenuIcon />
              </IconButton>
            </Stack>
            <Menu anchorEl={anchorEl} open={openMenu} onClose={handleMenuClose}>
              <MenuItem onClick={() => { signOut(auth); handleMenuClose(); }}>ログアウト</MenuItem>
              <MenuItem onClick={() => { setOpenGuide(true); handleMenuClose(); }}>使い方</MenuItem>
              <MenuItem component="a" href="mailto:r-matsubara@rakusendo-hp.jp" onClick={handleMenuClose}>お問合せ</MenuItem>
            </Menu>

            <Box component="form" onSubmit={(e) => handleSubmit(e)} sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <FormControl fullWidth>
                <InputLabel id="ward-select-label">病棟を選択</InputLabel>
                <Select
                  labelId="ward-select-label"
                  value={ward}
                  label="病棟を選択"
                  onChange={(e) => setWard(e.target.value)}
                >
                  <MenuItem value="1st">第一病棟</MenuItem>
                  <MenuItem value="2nd">第二病棟</MenuItem>
                  <MenuItem value="other">その他</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="タイトル"
                variant="outlined"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <TextField fullWidth label="メッセージを入力" variant="outlined" value={text} onChange={(e) => setText(e.target.value)} />
              <Button type="submit" variant="contained">投稿</Button>
            </Box>
          </>
        ) : (
          <Button variant="contained" onClick={() => signInWithPopup(auth, provider)}>Googleでログイン</Button>
        )}
      </Box>

      <Dialog open={openGuide} onClose={() => setOpenGuide(false)}>
        <DialogTitle>
          使い方
          <IconButton
            aria-label="close"
            onClick={() => setOpenGuide(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography gutterBottom>
            楽仙堂掲示板は、病棟ごとの情報共有を目的とした掲示板です。
          </Typography>
          <Typography gutterBottom>
            ・上部タブから病棟を選んでください。
          </Typography>
          <Typography gutterBottom>
            ・タイトルとメッセージを入力して「投稿」するとスレッドが作成されます。
          </Typography>
          <Typography gutterBottom>
            ・返信は各投稿の下部から行えます。
          </Typography>
        </DialogContent>
      </Dialog>
      <List>
        {messages
          .filter((msg) => msg.ward === selectedWard)
          .map((msg) => (
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
                      <Box>
                        {msg.title && (
                          <Typography variant="h6" fontWeight="bold" gutterBottom>
                            {msg.title}
                          </Typography>
                        )}
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle2" fontWeight="bold">
                            {msg.userName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(msg.createdAt)}
                          </Typography>
                        </Box>
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
                          <TextField
                            fullWidth
                            size="small"
                            label="返信を入力"
                            variant="outlined"
                            value={getReplyText(msg.id)}
                            onChange={(e) => handleReplyChange(msg.id, e.target.value)}
                          />
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
