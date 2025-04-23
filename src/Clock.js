import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from './firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { Container, Box, TextField, Typography, Snackbar, Alert, Button, Stack, Switch } from '@mui/material';
import { styled } from '@mui/material/styles';
import AccessTimeFilledIcon from '@mui/icons-material/AccessTimeFilled';

const AntSwitch = styled(Switch)(({ theme }) => ({
  width: 60,
  height: 34,
  padding: 7,
  '& .MuiSwitch-switchBase': {
    margin: 1,
    padding: 0,
    transform: 'translateX(6px)',
    '&.Mui-checked': {
      color: '#fff',
      transform: 'translateX(22px)',
      '& + .MuiSwitch-track': {
        backgroundColor: '#1890ff',
        opacity: 1,
        border: 0,
      },
    },
  },
  '& .MuiSwitch-thumb': {
    backgroundColor: '#fff',
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  '& .MuiSwitch-track': {
    borderRadius: 20 / 2,
    backgroundColor: 'rgba(0,0,0,.25)',
    opacity: 1,
    transition: theme.transitions.create(['background-color'], {
      duration: 500,
    }),
  },
}));

function Clock() {
  const [input, setInput] = useState('');
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [user, setUser] = useState(null);
  const [method, setMethod] = useState('in');
  const allowedEmails = ['h.suwa@kenseikai-jp.com', 'admin@rakusendo.jp'];
  const inputRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      inputRef.current?.focus();
    }, 3000); // 3秒おきにフォーカス
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (loggedInUser) => {
      if (loggedInUser) {
        setUser(loggedInUser);
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('ja-JP', { hour12: false });
  };

  const handleSubmit = async () => {
    const scannedId = input.trim();
    if (!scannedId) {
      setMessage('ユーザーIDが未入力です');
      setOpen(true);
      return;
    }
    if (!user || !allowedEmails.includes(user.email)) {
      setMessage('許可されていないユーザーです');
      setOpen(true);
      return;
    }

    const staffSnap = await getDoc(doc(db, 'staffs', scannedId));
    if (!staffSnap.exists()) {
      setMessage('該当する職員が見つかりません');
      setOpen(true);
      return;
    }

    await addDoc(collection(db, 'clockings'), {
      userId: scannedId,
      timestamp: serverTimestamp(),
      method,
      verifiedBy: user.email,
      type: 'qr'
    });

    setMessage(`${staffSnap.data().name} の${method === 'in' ? '出勤' : '退勤'}を記録しました`);
    setOpen(true);
    setInput('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  if (!user) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>タイムレコーダーを利用するにはログインが必要です</Typography>
        <Button variant="contained" onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}>Googleでログイン</Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>Rakusen Time Recorder</Typography>
        <Typography variant="h1" sx={{ fontWeight: 'bold', mb: 2 }}>{formatTime(now)}</Typography>

        <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" sx={{ mb: 3 }}>
          <Typography color={method === 'in' ? 'primary' : 'text.secondary'} fontSize={32} fontWeight="bold">出勤</Typography>
          <AntSwitch
            checked={method === 'out'}
            onChange={(e) => setMethod(e.target.checked ? 'out' : 'in')}
          />
          <Typography color={method === 'out' ? 'error' : 'text.secondary'} fontSize={32} fontWeight="bold">退勤</Typography>
        </Stack>

        <TextField
          id="qr-input"
          label="ユーザーIDまたはQRコードを入力"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          inputRef={inputRef}
          onBlur={() => inputRef.current?.focus()}
          fullWidth
          sx={{ mb: 3, mx: 'auto' }}
        />

        <Button
          variant="contained"
          size="large"
          onClick={handleSubmit}
          startIcon={<AccessTimeFilledIcon />}
          color={method === 'in' ? 'primary' : 'error'}
          sx={{ fontSize: 20, py: 2, px: 4, mt: 2 }}
        >
          {method === 'in' ? '出勤する' : '退勤する'}
        </Button>

      </Box>
      <Snackbar open={open} autoHideDuration={3000} onClose={() => setOpen(false)}>
        <Alert severity="success" sx={{ width: '100%' }}>{message}</Alert>
      </Snackbar>
    </Container>
  );
}

export default Clock;
